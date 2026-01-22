import express from "express";
import Stripe from "stripe";
import Payment from "../models/Payment.js";
import requireAuth from "../middleware/requireAuth.js";
import requireRoomActive from "../middleware/requireRoomActive.js";

const router = express.Router();

const APP_URL = process.env.APP_URL || "http://localhost:5173";

// ✅ Валутата за Stripe Checkout (BGN вече не се приема)
const STRIPE_CURRENCY = "eur";

// ✅ Lazy Stripe
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

router.get("/", requireAuth, requireRoomActive, async (req, res) => {
  try {
    const { apartment, status, q, from, to } = req.query;

    const filter = { roomId: req.user.roomId };

    if (req.user.role === "manager") {
      if (apartment) filter.apartment = String(apartment).trim();
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
    }

    if (req.user.role === "resident") {
      const a = String(req.user.apartment || "").trim();
      filter.$or = [{ apartment: "" }, { apartment: a }];

      if (status) filter.status = status;
      if (q) filter.description = { $regex: q, $options: "i" };
    }

    const payments = await Payment.find(filter)
      .sort({ dateFrom: -1, createdAt: -1 })
      .populate("createdBy", "name email role apartment")
      .populate("paidBy.user", "name email apartment");

    res.json(payments);
  } catch (err) {
    console.error("❌ payments GET error:", err);
    res.status(500).json({
      message: "Грешка при зареждане на плащания",
      error: err.message,
    });
  }
});

router.post("/create", requireAuth, requireRoomActive, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res
        .status(403)
        .json({ message: "Само домоуправител може да създава плащания" });
    }

    let { description, amount, dateFrom, dateTo, apartment } = req.body;

    description = description ? String(description).trim() : "";
    const amountNum = Number(amount);

    if (!description || Number.isNaN(amountNum) || amountNum <= 0) {
      return res
        .status(400)
        .json({ message: "Въведете валидно описание и сума." });
    }

    const fixedEntrance = String(req.user.entrance || "").trim().toUpperCase();
    const apt = String(apartment || "").trim();

    const payment = await Payment.create({
      roomId: req.user.roomId,
      createdBy: req.user._id,

      description,
      amount: amountNum, // ✅ EUR

      building: req.user.building || "",
      entrance: fixedEntrance,
      apartment: apt,

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
    console.error("❌ payments CREATE error:", err);
    return res
      .status(500)
      .json({ message: "Грешка при създаване", error: err.message });
  }
});

router.post("/:id/checkout", requireAuth, requireRoomActive, async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res
        .status(500)
        .json({ message: "Stripe не е конфигуриран (липсва STRIPE_SECRET_KEY)." });
    }

    if (req.user.role !== "resident") {
      return res.status(403).json({ message: "Само живущ може да плаща" });
    }

    const payment = await Payment.findOne({
      _id: req.params.id,
      roomId: req.user.roomId,
    });
    if (!payment)
      return res.status(404).json({ message: "Начислението не е намерено" });

    if (payment.apartment) {
      const userApt = String(req.user.apartment || "").trim();
      if (String(payment.apartment).trim() !== userApt) {
        return res
          .status(403)
          .json({ message: "Това начисление е за друг апартамент." });
      }
    }

    // ✅ CHANGED: safer check (ако някога user е ObjectId или populate-нат обект)
    const alreadyPaid = (payment.paidBy || []).some((x) => {
      const uid = x?.user?._id || x?.user;
      return String(uid) === String(req.user._id);
    });

    if (alreadyPaid) {
      return res.status(400).json({ message: "Вече сте платили това начисление." });
    }

    const amount = Number(payment.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Невалидна сума." });
    }

    const unitAmount = Math.round(amount * 100);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: STRIPE_CURRENCY,
            unit_amount: unitAmount,
            product_data: {
              name: payment.description || "Плащане",
              description: payment.apartment
                ? `Начисление за ап. ${payment.apartment}`
                : "Начисление за всички апартаменти",
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
        apartment: String(req.user.apartment || ""),
      },
      customer_email: req.user.email || undefined,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ checkout error:", {
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

export default router;
