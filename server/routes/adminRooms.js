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
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Само Админ" });
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

// ✅ GET /api/admin/rooms/:roomId/members
// Детайл за членове на стаята + роля/статус
router.get("/rooms/:roomId/members", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId).lean();
    if (!room) return res.status(404).json({ message: "Room not found" });

    const ownerId = String(room.createdBy || "");
    const usersInRoom = await User.find({ roomId: room._id })
      .select("name email phone apartment role memberStatus")
      .lean();

    const usersById = new Map(usersInRoom.map((u) => [String(u._id), u]));
    const members = [];

    // 1) Вземаме members от room документа (ако има snapshots, пазим ги).
    for (const m of room.members || []) {
      const uid = m?.user ? String(m.user) : "";
      const u = uid ? usersById.get(uid) : null;

      members.push({
        _id: u?._id || (uid || null),
        name: m?.nameSnapshot || u?.name || "—",
        email: u?.email || "—",
        phone: m?.phoneSnapshot || u?.phone || "",
        apartment: m?.apartment || u?.apartment || "",
        role: u?.role || "resident",
        memberStatus: m?.status || u?.memberStatus || "pending",
        isRoomManager: !!(uid && ownerId && uid === ownerId),
      });

      if (uid) usersById.delete(uid);
    }

    // 2) Допълваме с users, които имат roomId, но ги няма в room.members.
    for (const [uid, u] of usersById.entries()) {
      members.push({
        _id: u._id,
        name: u.name || "—",
        email: u.email || "—",
        phone: u.phone || "",
        apartment: u.apartment || "",
        role: u.role || "resident",
        memberStatus: u.memberStatus || "pending",
        isRoomManager: !!(ownerId && uid === ownerId),
      });
    }

    // 3) Ако домоуправителят липсва в горния списък, добавяме го изрично.
    if (ownerId && !members.some((x) => String(x._id || "") === ownerId)) {
      const owner = await User.findById(ownerId).select("name email phone apartment role memberStatus").lean();
      if (owner) {
        members.unshift({
          _id: owner._id,
          name: owner.name || "—",
          email: owner.email || "—",
          phone: owner.phone || "",
          apartment: owner.apartment || "",
          role: owner.role || "manager",
          memberStatus: owner.memberStatus || "approved",
          isRoomManager: true,
        });
      } else {
        members.unshift({
          _id: ownerId,
          name: "Домоуправител (липсва профил)",
          email: "—",
          phone: "",
          apartment: "",
          role: "manager",
          memberStatus: "approved",
          isRoomManager: true,
        });
      }
    }

    const sorted = members.sort((a, b) => {
      if (a.isRoomManager && !b.isRoomManager) return -1;
      if (!a.isRoomManager && b.isRoomManager) return 1;

      const aApt = String(a.apartment || "");
      const bApt = String(b.apartment || "");
      return aApt.localeCompare(bApt, "bg", { numeric: true, sensitivity: "base" });
    });

    const summary = {
      total: sorted.length,
      managerCount: sorted.filter((x) => x.isRoomManager).length,
      residentCount: sorted.filter((x) => !x.isRoomManager).length,
      approvedCount: sorted.filter((x) => x.memberStatus === "approved").length,
      pendingCount: sorted.filter((x) => x.memberStatus === "pending").length,
    };

    res.json({
      room: {
        _id: room._id,
        city: room.city,
        building: room.building,
        entrance: room.entrance,
        code: room.code,
      },
      summary,
      members: sorted,
    });
  } catch (e) {
    res.status(500).json({ message: "Room members load error", error: e.message });
  }
});

export default router;
