import express from "express";
import Room from "../models/Room.js";
import User from "../models/User.js";
import requireAuth from "../middleware/requireAuth.js";
import shouldRequireRoomEmailVerify from "../middleware/shouldRequireRoomEmailVerify.js";
import {
  apartmentSort,
  formatApartmentList,
  getManagerRequestApartments,
  getMemberApartments,
  getUserApartments,
  setMemberApartments,
  setUserApartments,
} from "../src/utils/apartments.js";

const router = express.Router();

function makeCode(building, entrance) {
  const n = Math.floor(100000 + Math.random() * 900000);
  const b = String(building || "").toUpperCase().trim();
  const e = String(entrance || "").toUpperCase().trim();
  return `${b}-${e}-${n}`;
}

function requireAdmin(req, res) {
  if (!req.user) {
    res.status(401).json({ message: "Няма потребител" });
    return false;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ message: "Нямате права" });
    return false;
  }
  return true;
}

function apartmentSortKey(value) {
  const apartments = Array.isArray(value) ? value : getUserApartments(value);
  return apartments[0] || "";
}

function sortMembers(members) {
  return [...members].sort((a, b) => {
    if (a.isRoomManager && !b.isRoomManager) return -1;
    if (!a.isRoomManager && b.isRoomManager) return 1;

    return apartmentSort(apartmentSortKey(a), apartmentSortKey(b));
  });
}

function roomLabel(room) {
  return [room?.city, room?.building ? `блок ${room.building}` : "", room?.entrance ? `вход ${room.entrance}` : ""]
    .filter(Boolean)
    .join(" • ");
}

async function findManagedRoomConflict(userId, targetRoomId = null) {
  const query = { createdBy: userId };
  if (targetRoomId) {
    query._id = { $ne: targetRoomId };
  }

  return Room.findOne(query).select("city building entrance").lean();
}

async function removeUserFromOtherRooms(userId, targetRoomId) {
  const rooms = await Room.find({
    _id: { $ne: targetRoomId },
    "members.user": userId,
  });

  for (const room of rooms) {
    const before = room.members.length;
    room.members = room.members.filter((member) => String(member.user) !== String(userId));
    if (room.members.length !== before) {
      await room.save();
    }
  }
}

router.get("/manager-requests", requireAuth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const list = await User.find({ managerRequestStatus: "pending" })
      .select(
        "name email phone managerRequestCity managerRequestBuilding managerRequestEntrance managerRequestApartment managerRequestApartments managerRequestedAt role"
      )
      .sort({ managerRequestedAt: -1 });

    res.json(
      list.map((u) => {
        const apartments = getManagerRequestApartments(u);
        return {
          ...u.toObject(),
          managerRequestApartment: apartments[0] || "",
          managerRequestApartments: apartments,
          managerRequestApartmentLabel: formatApartmentList(apartments),
        };
      })
    );
  } catch (e) {
    res.status(500).json({ message: "Manager requests load error", error: e.message });
  }
});

router.post("/manager-requests/:id/approve", requireAuth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ message: "Потребителят не е намерен" });

    if (u.managerRequestStatus !== "pending") {
      return res.status(400).json({ message: "Няма pending заявка за този потребител." });
    }

    if (shouldRequireRoomEmailVerify(u) && !u.emailVerified) {
      return res.status(400).json({
        message: "Потребителят трябва първо да потвърди имейла си, преди да стане домоуправител.",
        code: "EMAIL_NOT_VERIFIED_REQUIRED",
      });
    }

    const city = String(u.managerRequestCity || "").trim();
    const building = String(u.managerRequestBuilding || "").trim();
    const entrance = String(u.managerRequestEntrance || "").trim().toUpperCase();
    const apartments = getManagerRequestApartments(u);

    if (!city || !building || !entrance) {
      return res.status(400).json({ message: "Заявката е невалидна (липсват град/блок/вход)." });
    }

    if (!apartments.length) {
      return res.status(400).json({ message: "Заявката е невалидна (липсва апартамент на домоуправителя)." });
    }

    const managedConflict = await findManagedRoomConflict(u._id);
    if (managedConflict) {
      return res.status(409).json({
        message: `Потребителят вече управлява друг вход: ${roomLabel(managedConflict)}.`,
      });
    }

    const existing = await Room.findOne({ city, building, entrance });
    if (existing) {
      return res.status(409).json({
        message:
          "Вече има създадена стая за този вход. Ако искаш смяна на домоуправител - използвай transfer функцията.",
        roomId: existing._id,
      });
    }

    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const room = await Room.create({
      code: makeCode(building, entrance),
      city,
      building,
      entrance,
      createdBy: u._id,
      trialEndsAt,
      subscriptionExpires: null,
      apartmentsCount: null,
      members: [
        {
          user: u._id,
          status: "approved",
          nameSnapshot: u.name || "",
          phoneSnapshot: u.phone || "",
          apartment: apartments[0] || "",
          apartments,
        },
      ],
    });

    await removeUserFromOtherRooms(u._id, room._id);

    u.role = "manager";
    u.managerRequestStatus = "approved";
    u.city = city;
    u.building = building;
    u.entrance = entrance;
    setUserApartments(u, apartments);
    u.roomId = room._id;
    u.memberStatus = "approved";

    await u.save();

    res.json({
      message: "Одобрено. Стаята е създадена и потребителят вече е домоуправител.",
      roomId: room._id,
    });
  } catch (e) {
    res.status(500).json({ message: "Approve manager request error", error: e.message });
  }
});

router.post("/manager-requests/:id/reject", requireAuth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ message: "Потребителят не е намерен" });

    if (u.managerRequestStatus !== "pending") {
      return res.status(400).json({ message: "Няма pending заявка за този потребител." });
    }

    u.managerRequestStatus = "rejected";
    await u.save();

    res.json({ message: "Отказано." });
  } catch (e) {
    res.status(500).json({ message: "Reject manager request error", error: e.message });
  }
});

router.post("/rooms/:roomId/transfer-manager", requireAuth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { roomId } = req.params;
    const email = String(req.body.email || "").trim().toLowerCase();
    const userId = String(req.body.userId || "").trim();

    if (!email && !userId) {
      return res.status(400).json({ message: "Подай email или userId за новия домоуправител." });
    }

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const newManager = email ? await User.findOne({ email }) : await User.findById(userId);
    if (!newManager) return res.status(404).json({ message: "Потребителят не е намерен." });
    if (newManager.role === "admin") return res.status(400).json({ message: "Admin не може да бъде домоуправител." });

    if (shouldRequireRoomEmailVerify(newManager) && !newManager.emailVerified) {
      return res.status(400).json({
        message: "Потребителят трябва първо да потвърди имейла си, преди да стане домоуправител.",
        code: "EMAIL_NOT_VERIFIED_REQUIRED",
      });
    }

    const managedConflict = await findManagedRoomConflict(newManager._id, room._id);
    if (managedConflict) {
      return res.status(409).json({
        message: `Този потребител вече управлява друг вход: ${roomLabel(managedConflict)}.`,
      });
    }

    const member = room.members?.find((m) => String(m.user) === String(newManager._id));
    if (!member) {
      return res.status(400).json({
        message:
          "Този потребител не е член на тази стая. Първо трябва да влезе в стаята като живущ (join) и да бъде одобрен.",
      });
    }

    await removeUserFromOtherRooms(newManager._id, room._id);

    const memberApartments = getMemberApartments(member);
    const userApartments = getUserApartments(newManager);
    const apartments = memberApartments.length ? memberApartments : userApartments;

    if (!apartments.length) {
      return res.status(400).json({ message: "Новият домоуправител трябва да има поне един апартамент в стаята." });
    }

    const oldManagerId = room.createdBy ? String(room.createdBy) : null;
    if (oldManagerId && oldManagerId !== String(newManager._id)) {
      const old = await User.findById(oldManagerId);
      if (old && old.role !== "admin") {
        old.role = "resident";
        if (String(old.roomId || "") !== String(room._id)) old.roomId = room._id;
        if (old.memberStatus !== "approved") old.memberStatus = "approved";
        await old.save();
      }
    }

    newManager.role = "manager";
    newManager.managerRequestStatus = "approved";
    newManager.roomId = room._id;
    newManager.memberStatus = "approved";
    newManager.city = room.city;
    newManager.building = room.building;
    newManager.entrance = room.entrance;
    setUserApartments(newManager, apartments);

    await newManager.save();

    member.status = "approved";
    setMemberApartments(member, apartments);
    if (!String(member.nameSnapshot || "").trim()) member.nameSnapshot = newManager.name || "";
    if (!String(member.phoneSnapshot || "").trim()) member.phoneSnapshot = newManager.phone || "";

    room.createdBy = newManager._id;
    await room.save();

    res.json({
      message: "Домоуправителят е сменен. Старият остава живущ в същия вход.",
      roomId: room._id,
      newManager: { id: newManager._id, name: newManager.name, email: newManager.email },
    });
  } catch (e) {
    res.status(500).json({ message: "Transfer manager error", error: e.message });
  }
});

router.get("/rooms/:roomId/members", requireAuth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { roomId } = req.params;
    const room = await Room.findById(roomId).lean();
    if (!room) return res.status(404).json({ message: "Room not found" });

    const ownerId = String(room.createdBy || "");
    const usersInRoom = await User.find({ roomId: room._id })
      .select("name email phone apartment apartments role memberStatus")
      .lean();

    const usersById = new Map(usersInRoom.map((u) => [String(u._id), u]));
    const members = [];

    for (const m of room.members || []) {
      const uid = m?.user ? String(m.user) : "";
      const u = uid ? usersById.get(uid) : null;
      const apartments = getMemberApartments(m).length ? getMemberApartments(m) : getUserApartments(u);

      members.push({
        _id: u?._id || (uid || null),
        name: m?.nameSnapshot || u?.name || "—",
        email: u?.email || "—",
        phone: m?.phoneSnapshot || u?.phone || "",
        apartment: apartments[0] || "",
        apartments,
        apartmentLabel: formatApartmentList(apartments),
        role: u?.role || "resident",
        memberStatus: m?.status || u?.memberStatus || "pending",
        isRoomManager: !!(uid && ownerId && uid === ownerId),
      });

      if (uid) usersById.delete(uid);
    }

    for (const [uid, u] of usersById.entries()) {
      const apartments = getUserApartments(u);
      members.push({
        _id: u._id,
        name: u.name || "—",
        email: u.email || "—",
        phone: u.phone || "",
        apartment: apartments[0] || "",
        apartments,
        apartmentLabel: formatApartmentList(apartments),
        role: u.role || "resident",
        memberStatus: u.memberStatus || "pending",
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
