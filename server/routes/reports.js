import express from "express";
import Payment from "../models/Payment.js";
import Room from "../models/Room.js";
import requireAuth from "../middleware/requireAuth.js";
import requireRoomActive from "../middleware/requireRoomActive.js";
import {
  countPaidUnits,
  getPaymentTargetApartments,
} from "../src/utils/apartments.js";

const router = express.Router();

function buildQuery(q, roomId) {
  const query = { roomId };

  if (q.status) query.status = q.status;
  if (q.entrance) query.entrance = String(q.entrance).trim().toUpperCase();

  if (q.from || q.to) {
    query.createdAt = {};
    if (q.from) query.createdAt.$gte = new Date(q.from);
    if (q.to) {
      const end = new Date(q.to);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  return query;
}

function filterByApartment(payments, apartment) {
  const apt = String(apartment || "").trim();
  if (!apt) return payments;

  return payments.filter((payment) => getPaymentTargetApartments(payment).includes(apt));
}

function totalUnitsForPayment(payment, room) {
  const targets = getPaymentTargetApartments(payment);
  if (targets.length) return targets.length;

  const apartmentsCount = Number(room?.apartmentsCount || 0);
  return Number.isInteger(apartmentsCount) && apartmentsCount > 0 ? apartmentsCount : 0;
}

router.get("/payments", requireAuth, requireRoomActive, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Само домоуправител има достъп" });
    }

    const query = buildQuery(req.query, req.user.roomId);

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email");

    const scoped = filterByApartment(payments, req.query.apartment);

    res.json({ payments: scoped, count: scoped.length });
  } catch (err) {
    res.status(500).json({ message: "Грешка при зареждане на справката", error: err.message });
  }
});

router.get("/summary", requireAuth, requireRoomActive, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Само домоуправител има достъп" });
    }

    const [room, rawPayments] = await Promise.all([
      Room.findById(req.user.roomId).select("apartmentsCount").lean(),
      Payment.find(buildQuery(req.query, req.user.roomId)),
    ]);

    const payments = filterByApartment(rawPayments, req.query.apartment);

    const total = payments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0) * totalUnitsForPayment(payment, room),
      0
    );

    const paid = payments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0) * countPaidUnits(payment),
      0
    );

    const unpaid = Math.max(total - paid, 0);

    res.json({ total, paid, unpaid, count: payments.length });
  } catch (err) {
    res.status(500).json({ message: "Грешка при генериране на справка", error: err.message });
  }
});

export default router;
