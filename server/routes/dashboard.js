import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireRoomActive from "../middleware/requireRoomActive.js";
import Room from "../models/Room.js";
import Payment from "../models/Payment.js";
import { buildPaidApartmentSet, getPaymentTargetApartments } from "../src/utils/apartments.js";

const router = express.Router();

function statusForPaymentAndApartment(payment, apartment) {
  const now = new Date();
  const due = payment.dateTo ? new Date(payment.dateTo) : null;
  const paid = buildPaidApartmentSet(payment).has(apartment);

  if (paid) return "paid";
  if (due && due < now) return "overdue";
  return "unpaid";
}

router.get("/apartments-status", requireAuth, requireRoomActive, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Само домоуправител" });
    }

    const room = await Room.findById(req.user.roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const apartmentsCount = room.apartmentsCount || 0;
    if (!apartmentsCount) {
      return res.json({ apartmentsCount: 0, apartments: [] });
    }

    const payments = await Payment.find({ roomId: room._id }).sort({ createdAt: -1 });

    const apartments = [];
    for (let i = 1; i <= apartmentsCount; i += 1) {
      const apt = String(i);
      const relevant = payments.filter((payment) => {
        const targets = getPaymentTargetApartments(payment);
        return !targets.length || targets.includes(apt);
      });

      let paid = 0;
      let unpaid = 0;
      let overdue = 0;

      for (const payment of relevant) {
        const status = statusForPaymentAndApartment(payment, apt);
        if (status === "paid") paid += 1;
        else if (status === "overdue") overdue += 1;
        else unpaid += 1;
      }

      const overall = overdue > 0 ? "overdue" : unpaid > 0 ? "unpaid" : "paid";

      apartments.push({
        apartment: apt,
        overall,
        counts: { paid, unpaid, overdue },
      });
    }

    res.json({ apartmentsCount, apartments });
  } catch (e) {
    res.status(500).json({ message: "Dashboard status error", error: e.message });
  }
});

export default router;
