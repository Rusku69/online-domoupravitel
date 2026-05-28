import express from "express";
import jwt from "jsonwebtoken";
import Room from "../models/Room.js";
import User from "../models/User.js";
import {
  apartmentSort,
  formatApartmentList,
  getMemberApartments,
  getOccupiedApartmentSet,
  getUserApartments,
} from "../src/utils/apartments.js";

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

function sortMembers(members) {
  return [...members].sort((a, b) => {
    if (a.isRoomManager && !b.isRoomManager) return -1;
    if (!a.isRoomManager && b.isRoomManager) return 1;

    const aFirst = Array.isArray(a.apartments) ? a.apartments[0] || "" : String(a.apartment || "");
    const bFirst = Array.isArray(b.apartments) ? b.apartments[0] || "" : String(b.apartment || "");
    return apartmentSort(aFirst, bFirst);
  });
}

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

    const mapped = rooms.map((room) => ({
      _id: room._id,
      code: room.code,
      city: room.city,
      building: room.building,
      entrance: room.entrance,
      apartmentsCount: room.apartmentsCount ?? null,
      createdAt: room.createdAt,
      createdBy: room.createdBy || null,
      membersCount: Array.isArray(room.members) ? room.members.length : 0,
      subscription: subStatus(room),
    }));

    let out = mapped;
    if (active === "true") out = mapped.filter((x) => x.subscription.active);
    if (active === "false") out = mapped.filter((x) => !x.subscription.active);

    res.json(out);
  } catch (e) {
    res.status(500).json({ message: "Rooms load error", error: e.message });
  }
});

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

      if (room.apartmentsCount !== null) {
        const occupied = Array.from(getOccupiedApartmentSet(room));
        const invalidOccupied = occupied.filter((apt) => /^\d+$/.test(apt) && Number(apt) > n);

        if (invalidOccupied.length) {
          return res.status(400).json({
            message: `Не може да намалиш броя под вече заетите апартаменти: ${invalidOccupied.join(", ")}.`,
          });
        }
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
      message: "Запазено.",
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

router.get("/rooms/:roomId/members", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId).lean();
    if (!room) return res.status(404).json({ message: "Room not found" });

    const ownerId = String(room.createdBy || "");
    const usersInRoom = await User.find({ roomId: room._id })
      .select("name email phone apartment apartments role memberStatus")
      .lean();

    const usersById = new Map(usersInRoom.map((u) => [String(u._id), u]));
    const members = [];

    for (const member of room.members || []) {
      const uid = member?.user ? String(member.user) : "";
      const user = uid ? usersById.get(uid) : null;
      const apartments = getMemberApartments(member).length
        ? getMemberApartments(member)
        : getUserApartments(user);

      members.push({
        _id: user?._id || (uid || null),
        name: member?.nameSnapshot || user?.name || "—",
        email: user?.email || "—",
        phone: member?.phoneSnapshot || user?.phone || "",
        apartment: apartments[0] || "",
        apartments,
        apartmentLabel: formatApartmentList(apartments),
        role: user?.role || "resident",
        memberStatus: member?.status || user?.memberStatus || "pending",
        isRoomManager: !!(uid && ownerId && uid === ownerId),
      });

      if (uid) usersById.delete(uid);
    }

    for (const [uid, user] of usersById.entries()) {
      const apartments = getUserApartments(user);
      members.push({
        _id: user._id,
        name: user.name || "—",
        email: user.email || "—",
        phone: user.phone || "",
        apartment: apartments[0] || "",
        apartments,
        apartmentLabel: formatApartmentList(apartments),
        role: user.role || "resident",
        memberStatus: user.memberStatus || "pending",
        isRoomManager: !!(ownerId && uid === ownerId),
      });
    }

    if (ownerId && !members.some((x) => String(x._id || "") === ownerId)) {
      const owner = await User.findById(ownerId).select("name email phone apartment apartments role memberStatus").lean();
      if (owner) {
        const apartments = getUserApartments(owner);
        members.unshift({
          _id: owner._id,
          name: owner.name || "—",
          email: owner.email || "—",
          phone: owner.phone || "",
          apartment: apartments[0] || "",
          apartments,
          apartmentLabel: formatApartmentList(apartments),
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
          apartments: [],
          apartmentLabel: "—",
          role: "manager",
          memberStatus: "approved",
          isRoomManager: true,
        });
      }
    }

    const sorted = sortMembers(members);

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
