import express from "express";
import Payment from "../models/Payment.js";
import requireAuth from "../middleware/requireAuth.js";
import requireRoomActive from "../middleware/requireRoomActive.js";

const router = express.Router();

function buildQuery(q, roomId) {
  const query = { roomId };

  if (q.status) query.status = q.status;
  if (q.entrance) query.entrance = String(q.entrance).trim().toUpperCase();
  if (q.apartment) query.apartment = String(q.apartment).trim();

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

// ✅ Детайл (само manager) + LOCKED
router.get("/payments", requireAuth, requireRoomActive, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Само домоуправител има достъп" });
    }

    const query = buildQuery(req.query, req.user.roomId);

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email");

    res.json({ payments, count: payments.length });
  } catch (err) {
    res.status(500).json({ message: "Грешка при зареждане на справката", error: err.message });
  }
});

// ✅ Summary (само manager) + LOCKED
router.get("/summary", requireAuth, requireRoomActive, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Само домоуправител има достъп" });
    }

    const query = buildQuery(req.query, req.user.roomId);
    const payments = await Payment.find(query);

    const total = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // ⚠️ ако ти реално НЕ ползваш payment.status="paid", а paidBy[] -> кажи и ще го сметнем правилно
    const paid = payments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const unpaid = total - paid;

    res.json({ total, paid, unpaid, count: payments.length });
  } catch (err) {
    res.status(500).json({ message: "Грешка при генериране на справка", error: err.message });
  }
});

export default router;
