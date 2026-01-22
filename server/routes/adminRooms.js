import express from "express";
import jwt from "jsonwebtoken";
import Room from "../models/Room.js";
import User from "../models/User.js";

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

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Само admin" });
  next();
};

function subStatus(room) {
  const now = new Date();
  const trialActive = !!(room.trialEndsAt && new Date(room.trialEndsAt) > now);
  const paidActive = !!(room.subscriptionExpires && new Date(room.subscriptionExpires) > now);
  const active = trialActive || paidActive;

  return {
    active,
    trialActive,
    paidActive,
    trialEndsAt: room.trialEndsAt || null,
    subscriptionExpires: room.subscriptionExpires || null,
  };
}

// ✅ GET /api/admin/rooms?q=plovdiv&active=true
router.get("/rooms", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { q, active } = req.query;

    const filter = {};
    if (q && String(q).trim()) {
      const s = String(q).trim();
      filter.$or = [
        { city: { $regex: s, $options: "i" } },
        { building: { $regex: s, $options: "i" } },
        { entrance: { $regex: s, $options: "i" } },
        { code: { $regex: s, $options: "i" } },
      ];
    }

    const rooms = await Room.find(filter)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email phone");

    const mapped = rooms.map((r) => ({
      _id: r._id,
      code: r.code,
      city: r.city,
      building: r.building,
      entrance: r.entrance,
      apartmentsCount: r.apartmentsCount ?? null,
      createdAt: r.createdAt,
      createdBy: r.createdBy || null,
      membersCount: Array.isArray(r.members) ? r.members.length : 0,
      subscription: subStatus(r),
    }));

    let out = mapped;
    if (active === "true") out = mapped.filter((x) => x.subscription.active);
    if (active === "false") out = mapped.filter((x) => !x.subscription.active);

    res.json(out);
  } catch (e) {
    res.status(500).json({ message: "Rooms load error", error: e.message });
  }
});

// ✅ PUT /api/admin/rooms/:roomId/settings
// Body: { apartmentsCount?, trialEndsAt?, subscriptionExpires? }
router.put("/rooms/:roomId/settings", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const { apartmentsCount, trialEndsAt, subscriptionExpires } = req.body;

    if (apartmentsCount !== undefined) {
      const n = Number(apartmentsCount);
      if (!Number.isFinite(n) || n <= 0 || n > 500) {
        return res.status(400).json({ message: "Невалиден брой апартаменти (1-500)" });
      }
      room.apartmentsCount = n;
    }

    if (trialEndsAt !== undefined) {
      room.trialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;
    }

    if (subscriptionExpires !== undefined) {
      room.subscriptionExpires = subscriptionExpires ? new Date(subscriptionExpires) : null;
    }

    await room.save();

    res.json({
      message: "✅ Запазено.",
      room: {
        _id: room._id,
        apartmentsCount: room.apartmentsCount ?? null,
        trialEndsAt: room.trialEndsAt ?? null,
        subscriptionExpires: room.subscriptionExpires ?? null,
        subscription: subStatus(room),
      },
    });
  } catch (e) {
    res.status(500).json({ message: "Settings update error", error: e.message });
  }
});

export default router;
