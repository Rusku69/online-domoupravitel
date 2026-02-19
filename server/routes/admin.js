import express from "express";
import Room from "../models/Room.js";
import User from "../models/User.js";
import requireAuth from "../middleware/requireAuth.js";
import shouldRequireRoomEmailVerify from "../middleware/shouldRequireRoomEmailVerify.js";

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

/**
 * ✅ GET /api/admin/manager-requests
 * Pending заявки за домоуправител
 */
router.get("/manager-requests", requireAuth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const list = await User.find({ managerRequestStatus: "pending" })
      .select(
        "name email phone managerRequestCity managerRequestBuilding managerRequestEntrance managerRequestApartment managerRequestedAt role"
      )
      .sort({ managerRequestedAt: -1 });

    res.json(list);
  } catch (e) {
    res.status(500).json({ message: "Manager requests load error", error: e.message });
  }
});

/**
 * ✅ POST /api/admin/manager-requests/:id/approve
 * Одобрение:
 * - user става manager
 * - създаваме room за managerRequestCity/building/entrance (ако няма)
 * - user става createdBy + approved member + roomId
 * - user.apartment се задава от managerRequestApartment (за да може да си е живущ)
 */
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
    const apartment = String(u.managerRequestApartment || "").trim(); // ✅ NEW

    if (!city || !building || !entrance) {
      return res.status(400).json({ message: "Заявката е невалидна (липсват град/блок/вход)." });
    }

    // ✅ домоуправителят трябва да си има апартамент (живее си там)
    if (!apartment) {
      return res.status(400).json({ message: "Заявката е невалидна (липсва апартамент на домоуправителя)." });
    }

    const existing = await Room.findOne({ city, building, entrance });
    if (existing) {
      return res.status(409).json({
        message:
          "Вече има създадена стая за този вход. Ако искаш смяна на домоуправител — използвай transfer функцията.",
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
          apartment, // ✅ NEW: апартаментът на домоуправителя
        },
      ],
    });

    // ✅ user -> manager, но си остава живущ (има apartment)
    u.role = "manager";
    u.managerRequestStatus = "approved";

    // ✅ синхронизирай профилната локация
    u.city = city;
    u.building = building;
    u.entrance = entrance;
    u.apartment = apartment; // ✅ NEW

    u.roomId = room._id;
    u.memberStatus = "approved";

    // (по желание) можеш да чистиш request полетата, но не е задължително
    // u.managerRequestCity = "";
    // u.managerRequestBuilding = "";
    // u.managerRequestEntrance = "";
    // u.managerRequestApartment = "";
    // u.managerRequestedAt = null;

    await u.save();

    res.json({
      message: "✅ Одобрено. Стаята е създадена и потребителят вече е домоуправител.",
      roomId: room._id,
    });
  } catch (e) {
    res.status(500).json({ message: "Approve manager request error", error: e.message });
  }
});

/**
 * ✅ POST /api/admin/manager-requests/:id/reject
 */
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

    res.json({ message: "✅ Отказано." });
  } catch (e) {
    res.status(500).json({ message: "Reject manager request error", error: e.message });
  }
});

/**
 * ✅ POST /api/admin/rooms/:roomId/transfer-manager
 * Смяна на домоуправител за вече съществуваща стая.
 * Правило: новият домоуправител трябва вече да е член на тази стая.
 * Старият домоуправител става resident и си остава член на стаята.
 *
 * body: { email } или { userId }
 */
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

    // ✅ трябва да е член на тази стая
    const isMember = room.members?.some((m) => String(m.user) === String(newManager._id));
    if (!isMember) {
      return res.status(400).json({
        message:
          "Този потребител не е член на тази стая. Първо трябва да влезе в стаята като живущ (join) и да бъде одобрен.",
      });
    }

    // ✅ стар домоуправител -> resident (но остава в стаята)
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

    // ✅ нов домоуправител
    newManager.role = "manager";
    newManager.managerRequestStatus = "approved";

    newManager.roomId = room._id;
    newManager.memberStatus = "approved";

    // синхронизирай локацията (за да няма разминавания)
    newManager.city = room.city;
    newManager.building = room.building;
    newManager.entrance = room.entrance;

    await newManager.save();

    // ✅ members: гарантирай approved + ако няма apartment в member-а, запази от user-а
    const m = room.members.find((x) => String(x.user) === String(newManager._id));
    if (m) {
      m.status = "approved";
      if (!String(m.apartment || "").trim() && String(newManager.apartment || "").trim()) {
        m.apartment = String(newManager.apartment).trim();
      }
      if (!String(m.nameSnapshot || "").trim()) m.nameSnapshot = newManager.name || "";
      if (!String(m.phoneSnapshot || "").trim()) m.phoneSnapshot = newManager.phone || "";
    }

    // ✅ ownership
    room.createdBy = newManager._id;
    await room.save();

    res.json({
      message: "✅ Домоуправителят е сменен. Старият остава живущ в същия вход.",
      roomId: room._id,
      newManager: { id: newManager._id, name: newManager.name, email: newManager.email },
    });
  } catch (e) {
    res.status(500).json({ message: "Transfer manager error", error: e.message });
  }
});

/**
 * ✅ GET /api/admin/rooms/:roomId/members
 * Резервен endpoint (backup), за да е достъпен дори ако adminRooms route не е активен в даден deploy.
 */
router.get("/rooms/:roomId/members", requireAuth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { roomId } = req.params;
    const room = await Room.findById(roomId).lean();
    if (!room) return res.status(404).json({ message: "Room not found" });

    const ownerId = String(room.createdBy || "");
    const usersInRoom = await User.find({ roomId: room._id })
      .select("name email phone apartment role memberStatus")
      .lean();

    const usersById = new Map(usersInRoom.map((u) => [String(u._id), u]));
    const members = [];

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
