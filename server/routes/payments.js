import express from "express";
import Stripe from "stripe";
import Payment from "../models/Payment.js";
import Room from "../models/Room.js";
import requireAuth from "../middleware/requireAuth.js";
import requireRoomActive from "../middleware/requireRoomActive.js";
import {
  buildPaidApartmentSet,
  getPaidApartmentsForUser,
  getPaymentTargetApartments,
  getUserApartments,
  normalizeApartmentList,
} from "../src/utils/apartments.js";

const router = express.Router();

const APP_URL = process.env.APP_URL || "http://localhost:5173";
const STRIPE_CURRENCY = "eur";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

function applyCommonFilters(filter, query) {
  const { status, q, from, to } = query;

  if (status) filter.status = status;
  if (q) filter.description = { $regex: q, $options: "i" };

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  return filter;
}

function getOwedApartments(payment, user) {
  const ownedApartments = getUserApartments(user);
  const targetApartments = getPaymentTargetApartments(payment);

  if (!ownedApartments.length) return [];
  if (!targetApartments.length) return ownedApartments;

  return ownedApartments.filter((apt) => targetApartments.includes(apt));
}

router.get("/", requireAuth, requireRoomActive, async (req, res) => {
  try {
    const { apartment } = req.query;
    const filter = applyCommonFilters({ roomId: req.user.roomId }, req.query);

    if (req.user.role === "manager") {
      const payments = await Payment.find(filter)
        .sort({ dateFrom: -1, createdAt: -1 })
        .populate("createdBy", "name email role apartment apartments")
        .populate("paidBy.user", "name email apartment apartments");

      const targetApartment = String(apartment || "").trim();
      const scoped = targetApartment
        ? payments.filter((payment) => getPaymentTargetApartments(payment).includes(targetApartment))
        : payments;

      return res.json(scoped);
    }

    const ownedApartments = getUserApartments(req.user);
    if (!ownedApartments.length) return res.json([]);

    filter.$or = [{ apartment: "" }, { apartment: { $in: ownedApartments } }, { apartments: { $in: ownedApartments } }];

    const payments = await Payment.find(filter)
      .sort({ dateFrom: -1, createdAt: -1 })
      .populate("createdBy", "name email role apartment apartments")
      .populate("paidBy.user", "name email apartment apartments");

    res.json(payments);
  } catch (err) {
    console.error("payments GET error:", err);
    res.status(500).json({
      message: "Грешка при зареждане на плащания",
      error: err.message,
    });
  }
});

router.post("/create", requireAuth, requireRoomActive, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Само домоуправител може да създава плащания" });
    }

    let { description, amount, dateFrom, dateTo } = req.body;

    description = description ? String(description).trim() : "";
    const amountNum = Number(amount);
    const targetApartments = normalizeApartmentList(req.body.apartments ?? req.body.apartment);

    if (!description || Number.isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: "Въведете валидно описание и сума." });
    }

    const fixedEntrance = String(req.user.entrance || "").trim().toUpperCase();

    const payment = await Payment.create({
      roomId: req.user.roomId,
      createdBy: req.user._id,
      description,
      amount: amountNum,
      building: req.user.building || "",
      entrance: fixedEntrance,
      apartment: targetApartments[0] || "",
      apartments: targetApartments,
      dateFrom: dateFrom ? new Date(dateFrom) : null,
      dateTo: dateTo ? new Date(dateTo) : null,
      status: "unpaid",
      paidAt: null,
      paidBy: [],
    });

    return res.json({
      message: "Начислението е създадено успешно.",
      payment,
    });
  } catch (err) {
    console.error("payments CREATE error:", err);
    return res.status(500).json({ message: "Грешка при създаване", error: err.message });
  }
});

router.post("/:id/checkout", requireAuth, requireRoomActive, async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).json({ message: "Stripe не е конфигуриран (липсва STRIPE_SECRET_KEY)." });
    }

    if (!["resident", "manager"].includes(String(req.user.role || ""))) {
      return res
        .status(403)
        .json({ message: "Само живущ или домоуправител със собствен апартамент може да плаща" });
    }

    const payment = await Payment.findOne({
      _id: req.params.id,
      roomId: req.user.roomId,
    });
    if (!payment) {
      return res.status(404).json({ message: "Начислението не е намерено" });
    }

    const paidApartments = new Set(getPaidApartmentsForUser(payment, req.user));
    const outstandingApartments = getOwedApartments(payment, req.user).filter((apt) => !paidApartments.has(apt));

    if (!outstandingApartments.length) {
      return res.status(400).json({ message: "Нямате неплатени апартаменти по това начисление." });
    }

    const amount = Number(payment.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Невалидна сума." });
    }

    const unitAmount = Math.round(amount * 100);
    const scopeLabel =
      outstandingApartments.length === 1
        ? `Начисление за ап. ${outstandingApartments[0]}`
        : `Начисление за ап. ${outstandingApartments.join(", ")}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: outstandingApartments.length,
          price_data: {
            currency: STRIPE_CURRENCY,
            unit_amount: unitAmount,
            product_data: {
              name: payment.description || "Плащане",
              description: scopeLabel,
            },
          },
        },
      ],
      success_url: `${APP_URL}/payments?paid=1`,
      cancel_url: `${APP_URL}/payments?canceled=1`,
      metadata: {
        paymentId: String(payment._id),
        roomId: String(payment.roomId),
        userId: String(req.user._id),
        apartment: outstandingApartments[0] || "",
        apartments: outstandingApartments.join(","),
        units: String(outstandingApartments.length),
      },
      customer_email: req.user.email || undefined,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("checkout error:", {
      message: err?.message,
      type: err?.type,
      code: err?.code,
      rawMessage: err?.raw?.message,
      statusCode: err?.statusCode,
    });

    res.status(500).json({
      message: "Грешка при създаване на Stripe Checkout",
      error: err?.raw?.message || err?.message,
    });
  }
});

// Ръчно плащане за сив апартамент без регистриран потребител.
router.post("/:id/manual-paid", requireAuth, requireRoomActive, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Само домоуправител може да отбелязва плащане на ръка." });
    }

    const apartment = String(req.body.apartment || "").trim();
    const payerName = String(req.body.payerName || "").trim();
    if (!apartment) {
      return res.status(400).json({ message: "Липсва апартамент." });
    }
    if (!payerName) {
      return res.status(400).json({ message: "Въведете име за плащането." });
    }

    const payment = await Payment.findOne({
      _id: req.params.id,
      roomId: req.user.roomId,
    });
    if (!payment) {
      return res.status(404).json({ message: "Начислението не е намерено." });
    }

    const room = await Room.findById(req.user.roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (String(room.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: "Само създателят на входа може да отбелязва плащане." });
    }

    const total = Number(room.apartmentsCount || 0);
    const aptNumber = Number(apartment);
    if (!Number.isInteger(aptNumber) || aptNumber < 1 || (total > 0 && aptNumber > total)) {
      return res.status(400).json({ message: "Невалиден апартамент." });
    }

    // Ако начислението е само за конкретни апартаменти, не позволяваме друг апартамент.
    const targets = getPaymentTargetApartments(payment);
    if (targets.length && !targets.includes(apartment)) {
      return res.status(400).json({ message: "Това начисление не важи за този апартамент." });
    }

    if (buildPaidApartmentSet(payment).has(apartment)) {
      return res.status(400).json({ message: "Този апартамент вече е отбелязан като платил." });
    }

    // Записваме плащането в същия масив, който се използва и за Stripe плащания.
    payment.paidBy.push({
      user: null,
      method: "manual",
      paidAt: new Date(),
      payerName,
      apartment,
      apartments: [apartment],
    });

    await payment.save();

    // Увеличаваме текущия баланс, за да се вижда веднага в справките.
    room.finance = room.finance || {};
    room.finance.balance = Number(room.finance.balance || 0) + Number(payment.amount || 0);
    await room.save();

    const updated = await Payment.findById(payment._id)
      .populate("createdBy", "name email role apartment apartments")
      .populate("paidBy.user", "name email apartment apartments");

    res.json({ message: "Плащането е отбелязано на ръка.", payment: updated });
  } catch (err) {
    console.error("manual paid error:", err);
    res.status(500).json({ message: "Грешка при ръчно отбелязване на плащане", error: err.message });
  }
});

export default router;
