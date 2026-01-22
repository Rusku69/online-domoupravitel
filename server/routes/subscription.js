import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Room from "../models/Room.js";

const router = express.Router();

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    if (!token) return res.status(401).json({ message: "Няма токен" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    req.user = user;
    next();
  } catch {
    return res.status(403).json({ message: "Невалиден токен" });
  }
};

// ✅ renew room subscription (manager/admin only)
router.post("/renew", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "manager" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Само домоуправител/admin може да подновява" });
    }
    if (!req.user.roomId) return res.status(400).json({ message: "Нямате стая" });

    // ✅ CHANGED: Stripe-only (без method)
    const { months = 1 } = req.body;

    const m = Number(months);
    if (!Number.isFinite(m) || m < 1 || m > 24) {
      return res.status(400).json({ message: "Невалиден период (1-24 месеца)" });
    }

    const room = await Room.findById(req.user.roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    // удължаваме от max(today, current subscriptionExpires)
    const now = new Date();
    const base = room.subscriptionExpires && new Date(room.subscriptionExpires) > now
      ? new Date(room.subscriptionExpires)
      : now;

    const next = new Date(base);
    next.setMonth(next.getMonth() + m);

    room.subscriptionExpires = next;
    await room.save();

    res.json({
      message: `✅ Подновено за ${m} месец(а).`,
      subscriptionExpires: room.subscriptionExpires,
    });
  } catch (e) {
    res.status(500).json({ message: "Renew error", error: e.message });
  }
});

export default router;
