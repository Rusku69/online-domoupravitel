import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireRoomActive from "../middleware/requireRoomActive.js";
import Room from "../models/Room.js";
import User from "../models/User.js";
import Payment from "../models/Payment.js";

const router = express.Router();

// helper: дали payment е платено от даден апартамент
function paidByApartment(payment, userIdsSet) {
  return (payment.paidBy || []).some((x) => userIdsSet.has(String(x.user)));
}

function statusForPaymentAndApartment(payment, userIdsSet) {
  const now = new Date();
  const due = payment.dateTo ? new Date(payment.dateTo) : null;
  const paid = paidByApartment(payment, userIdsSet);

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

    // взимаме approved users за стаята
    const users = await User.find({ roomId: room._id, memberStatus: "approved" }).select("_id apartment");

    // map apt -> set(userIds)
    const aptMap = new Map();
    for (let i = 1; i <= apartmentsCount; i++) {
      aptMap.set(String(i), new Set());
    }
    for (const u of users) {
      const a = String(u.apartment || "").trim();
      if (aptMap.has(a)) aptMap.get(a).add(String(u._id));
    }

    const payments = await Payment.find({ roomId: room._id }).sort({ createdAt: -1 });

    const apartments = [];
    for (let i = 1; i <= apartmentsCount; i++) {
      const apt = String(i);
      const userIdsSet = aptMap.get(apt) || new Set();

      // релевантни плащания за този апартамент:
      // - общи (apartment == "")
      // - конкретно за този апартамент
      const relevant = payments.filter((p) => {
        const pa = String(p.apartment || "").trim();
        return pa === "" || pa === apt;
      });

      let paid = 0, unpaid = 0, overdue = 0;

      for (const p of relevant) {
        const st = statusForPaymentAndApartment(p, userIdsSet);
        if (st === "paid") paid++;
        else if (st === "overdue") overdue++;
        else unpaid++;
      }

      // “общ статус” за hover: най-лошият има приоритет
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
