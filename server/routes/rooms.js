import express from "express";
import Room from "../models/Room.js";
import User from "../models/User.js";
import requireAuth from "../middleware/requireAuth.js";
import requireVerifiedManager from "../middleware/requireVerifiedManager.js";
import requireRoomActive from "../middleware/requireRoomActive.js";
import requireRoomEmailVerified from "../middleware/requireRoomEmailVerified.js";

const router = express.Router();

function makeCode(building, entrance) {
  const n = Math.floor(100000 + Math.random() * 900000);
  const b = String(building || "").toUpperCase().trim();
  const e = String(entrance || "").toUpperCase().trim();
  return `${b}-${e}-${n}`;
}

// ✅ POST /api/rooms/manager-request
router.post("/manager-request", requireAuth, requireRoomEmailVerified, async (req, res) => {
  try {
    const u = req.user;

    if (u.role === "admin")
      return res.status(400).json({ message: "Админът няма нужда от заявка." });
    if (u.role === "manager")
      return res.status(400).json({ message: "Вече сте домоуправител." });

    const city = String(req.body.city || "").trim();
    const building = String(req.body.building || "").trim();
    const entrance = String(req.body.entrance || "").trim().toUpperCase();
    const apartment = String(req.body.apartment || "").trim();

    if (!city || !building || !entrance) {
      return res.status(400).json({ message: "Попълни град, блок и вход." });
    }

    if (!apartment) {
      return res.status(400).json({ message: "Попълни апартамент." });
    }

    if (u.managerRequestStatus === "pending") {
      return res
        .status(400)
        .json({ message: "Вече имаш изпратена заявка." });
    }

    const existing = await Room.findOne({ city, building, entrance });
    if (existing) {
      return res.status(409).json({
        message:
          "За този вход вече има създадена стая. Само Админ може да смени домоуправителя.",
      });
    }

    u.managerRequestStatus = "pending";
    u.managerRequestCity = city;
    u.managerRequestBuilding = building;
    u.managerRequestEntrance = entrance;
    u.managerRequestApartment = apartment;
    u.managerRequestedAt = new Date();
    await u.save();

    res.json({ message: "✅ Заявката е изпратена към Админ." });
  } catch (e) {
    res.status(500).json({ message: "Manager request error", error: e.message });
  }
});

// ✅ GET room by id
router.get("/:roomId", requireAuth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId).populate(
      "createdBy",
      "name email phone"
    );
    if (!room) return res.status(404).json({ message: "Room not found" });

    const isMember = room.members.some(
      (m) => String(m.user) === String(req.user._id)
    );
    if (!isMember && req.user.role !== "admin")
      return res.status(403).json({ message: "Нямате достъп" });

    const now = new Date();
    const trialActive = room.trialEndsAt && new Date(room.trialEndsAt) > now;
    const paidActive =
      room.subscriptionExpires && new Date(room.subscriptionExpires) > now;

    res.json({
      ...room.toObject(),
      subscription: {
        trialEndsAt: room.trialEndsAt,
        subscriptionExpires: room.subscriptionExpires,
        active: trialActive || paidActive,
        trialActive,
        paidActive,
      },
    });
  } catch (e) {
    res.status(500).json({ message: "Room load error", error: e.message });
  }
});

// ✅ JOIN room
router.post("/join", requireAuth, requireRoomEmailVerified, async (req, res) => {
  try {
    const u = req.user;
    const { code, apartment } = req.body;

    if (!code) return res.status(400).json({ message: "Липсва код" });

    const room = await Room.findOne({ code: String(code).trim() });
    if (!room) return res.status(404).json({ message: "Room not found" });

    const apt = String(apartment || "").trim();
    if (!apt) return res.status(400).json({ message: "Въведи апартамент" });

    const already = room.members.find((m) => String(m.user) === String(u._id));

    if (!already) {
      room.members.push({
        user: u._id,
        status: "pending",
        apartment: apt,
        nameSnapshot: u.name || "",
        phoneSnapshot: u.phone || "",
      });
      await room.save();
    }

    u.roomId = room._id;
    u.memberStatus = "pending";
    u.city = room.city;
    u.building = room.building;
    u.entrance = room.entrance;
    u.apartment = apt;
    await u.save();

    res.json({ message: "Заявката е изпратена.", roomId: room._id });
  } catch (e) {
    res.status(500).json({ message: "Join error", error: e.message });
  }
});

// ✅ APPROVE member
router.post("/approve", requireAuth, requireVerifiedManager, requireRoomActive, async (req, res) => {
  try {
    const manager = req.user;
    const { memberId } = req.body;

    if (!memberId)
      return res.status(400).json({ message: "Missing memberId" });

    const room = await Room.findById(manager.roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (String(room.createdBy) !== String(manager._id))
      return res.status(403).json({ message: "Нямате права" });

    const m = room.members.find((x) => String(x.user) === String(memberId));
    if (!m) return res.status(404).json({ message: "Member not found" });

    m.status = "approved";
    await room.save();

    await User.findByIdAndUpdate(memberId, {
      memberStatus: "approved",
      roomId: room._id,
      apartment: m.apartment,
    });

    res.json({ message: "Approved" });
  } catch (e) {
    res.status(500).json({ message: "Approve error", error: e.message });
  }
});

// ✅ pending list by roomId
router.get("/:roomId/pending", requireAuth, requireRoomActive, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId).populate(
      "members.user",
      "name email phone apartment"
    );
    if (!room) return res.status(404).json({ message: "Room not found" });

    const isAdmin = req.user.role === "admin";
    const isCreator = String(room.createdBy) === String(req.user._id);
    if (!isAdmin && !isCreator)
      return res.status(403).json({ message: "Нямате права" });

    const pending = room.members
      .filter((m) => m.status === "pending")
      .map((m) => {
        const u = m.user;
        return {
          _id: u?._id,
          name: m.nameSnapshot || u?.name || "—",
          email: u?.email || "—",
          phone: m.phoneSnapshot || u?.phone || "",
          apartment: m.apartment || u?.apartment || "",
        };
      });

    res.json(pending);
  } catch (e) {
    res.status(500).json({ message: "Pending error", error: e.message });
  }
});

// ✅ GET room members + settings (manager creator only)
router.get(
  "/:roomId/members",
  requireAuth,
  requireVerifiedManager,
  requireRoomActive,
  async (req, res) => {
    try {
      const room = await Room.findById(req.params.roomId)
        .populate("members.user", "name email phone apartment role")
        .populate("createdBy", "name email phone");

      if (!room) return res.status(404).json({ message: "Room not found" });

      if (req.user.role !== "manager")
        return res
          .status(403)
          .json({ message: "Само домоуправител има достъп." });

      if (String(room.createdBy._id) !== String(req.user._id))
        return res
          .status(403)
          .json({ message: "Само създателят има достъп." });

      res.json({
        room: {
          _id: room._id,
          code: room.code,
          city: room.city,
          building: room.building,
          entrance: room.entrance,
          apartmentsCount: room.apartmentsCount ?? null,
          trialEndsAt: room.trialEndsAt ?? null,
          subscriptionExpires: room.subscriptionExpires ?? null,

          finance: room.finance || {
            iban: "",
            holderName: "",
            balance: 0,
            locked: false,
            expenses: [],
          },
        },
        members: room.members.map((m) => ({
          _id: m.user?._id,
          status: m.status,
          apartment: m.apartment || "",
          name: m.nameSnapshot || m.user?.name || "",
          email: m.user?.email || "",
          phone: m.phoneSnapshot || m.user?.phone || "",
          role: m.user?.role || "",
          tenantTag: !!m.tenantTag,
        })),
      });
    } catch (e) {
      res
        .status(500)
        .json({ message: "Members load error", error: e.message });
    }
  }
);

// ✅ helper: only manager creator
async function requireManagerCreator(req, res, roomId) {
  const room = await Room.findById(roomId);
  if (!room)
    return { error: res.status(404).json({ message: "Room not found" }) };

  if (req.user.role !== "manager")
    return {
      error: res
        .status(403)
        .json({ message: "Само домоуправител има достъп." }),
    };

  if (String(room.createdBy) !== String(req.user._id))
    return {
      error: res
        .status(403)
        .json({ message: "Само създателят може да управлява." }),
    };

  return { room };
}

// ✅ SET / TOGGLE tenant tag
router.patch(
  "/:roomId/members/:memberId/tag",
  requireAuth,
  requireVerifiedManager,
  requireRoomActive,
  async (req, res) => {
    try {
      const { roomId, memberId } = req.params;
      const { room, error } = await requireManagerCreator(req, res, roomId);
      if (error) return;

      const m = room.members.find((x) => String(x.user) === String(memberId));
      if (!m) return res.status(404).json({ message: "Member not found" });

      m.tenantTag =
        typeof req.body.tenantTag === "boolean"
          ? req.body.tenantTag
          : !m.tenantTag;

      await room.save();
      res.json({ message: "Запазено", tenantTag: m.tenantTag });
    } catch (e) {
      res.status(500).json({ message: "Tag error", error: e.message });
    }
  }
);

// ✅ KICK member (manager-only + verified)
router.delete(
  "/:roomId/members/:memberId",
  requireAuth,
  requireVerifiedManager,
  requireRoomActive,
  async (req, res) => {
    try {
      const { roomId, memberId } = req.params;
      const { room, error } = await requireManagerCreator(req, res, roomId);
      if (error) return;

      if (String(memberId) === String(req.user._id)) {
        return res
          .status(400)
          .json({ message: "Не можеш да премахнеш себе си." });
      }

      const before = room.members.length;
      room.members = room.members.filter(
        (m) => String(m.user) !== String(memberId)
      );

      if (room.members.length === before) {
        return res.status(404).json({ message: "Member not found" });
      }

      await room.save();

      const u = await User.findById(memberId);
      if (u && String(u.roomId) === String(room._id)) {
        u.roomId = null;
        u.memberStatus = "pending";
        u.city = "";
        u.building = "";
        u.entrance = "";
        u.apartment = "";
        await u.save();
      }

      res.json({ message: "Живущият е премахнат." });
    } catch (e) {
      res.status(500).json({ message: "Kick error", error: e.message });
    }
  }
);

// =======================================================
// 🏢 APARTMENTS COUNT (фиксира се)
// =======================================================

async function setApartmentsCount(req, res) {
  const { roomId } = req.params;
  const n = Number(req.body.apartmentsCount ?? req.body.count);

  if (!Number.isFinite(n) || n <= 0 || n > 500) {
    return res.status(400).json({ message: "Невалиден брой апартаменти." });
  }

  const room = await Room.findById(roomId);
  if (!room) return res.status(404).json({ message: "Room not found" });

  const isAdmin = req.user.role === "admin";
  const isCreator = String(room.createdBy) === String(req.user._id);

  if (!isAdmin && !isCreator) {
    return res.status(403).json({ message: "Нямате права." });
  }

  if (!isAdmin && room.apartmentsCount !== null) {
    return res.status(403).json({
      message: "Броят вече е зададен. Само Админ може да го променя.",
    });
  }

  room.apartmentsCount = n;
  await room.save();

  res.json({ message: "Запазено.", apartmentsCount: room.apartmentsCount });
}

router.put("/:roomId/apartments-count", requireAuth, requireRoomActive, async (req, res) => {
  try {
    await setApartmentsCount(req, res);
  } catch (e) {
    res
      .status(500)
      .json({ message: "ApartmentsCount error", error: e.message });
  }
});

router.post("/:roomId/apartments-count", requireAuth, requireRoomActive, async (req, res) => {
  try {
    await setApartmentsCount(req, res);
  } catch (e) {
    res
      .status(500)
      .json({ message: "ApartmentsCount error", error: e.message });
  }
});

// =======================================================
// 💰 FINANCE (Reports) — ЕДИНСТВЕНА ВЕРСИЯ
// =======================================================

// ✅ GET finance data (manager creator only; admin може да гледа)
router.get("/:roomId/finance", requireAuth, requireRoomActive, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const isAdmin = req.user.role === "admin";
    const isCreator = String(room.createdBy) === String(req.user._id);

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: "Нямате права" });
    }

    res.json(room.finance || {});
  } catch (e) {
    res.status(500).json({ message: "Finance load error", error: e.message });
  }
});

// ✅ LOCK finance data (IBAN + holderName + initialAmount) — само веднъж
router.post(
  "/:roomId/finance/lock",
  requireAuth,
  requireVerifiedManager,
  requireRoomActive,
  async (req, res) => {
    try {
      const { roomId } = req.params;
      const { iban, holderName, initialAmount } = req.body;

      const { room, error } = await requireManagerCreator(req, res, roomId);
      if (error) return;

      if (room.finance?.locked) {
        return res.status(400).json({ message: "Данните вече са заключени" });
      }

      const cleanIban = String(iban || "").trim();
      const cleanHolder = String(holderName || "").trim();
      const start = Number(initialAmount);

      if (!cleanHolder) {
        return res.status(400).json({ message: "Липсва име на получателя" });
      }
      if (!cleanIban || cleanIban.length < 10) {
        return res.status(400).json({ message: "Невалиден IBAN" });
      }
      if (!Number.isFinite(start) || start < 0) {
        return res.status(400).json({ message: "Невалиден начален баланс" });
      }

      room.finance = {
        iban: cleanIban,
        holderName: cleanHolder,
        balance: start,
        locked: true,
        expenses: [],
      };

      await room.save();
      res.json(room.finance);
    } catch (e) {
      res.status(500).json({ message: "Finance lock error", error: e.message });
    }
  }
);

// ✅ ADD expense (само ако е locked)
router.post(
  "/:roomId/finance/expense",
  requireAuth,
  requireVerifiedManager,
  requireRoomActive,
  async (req, res) => {
    try {
      const { roomId } = req.params;
      const { amount, description } = req.body;

      const { room, error } = await requireManagerCreator(req, res, roomId);
      if (error) return;

      if (!room.finance?.locked) {
        return res
          .status(400)
          .json({ message: "Първо заключи IBAN и началния баланс" });
      }

      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) {
        return res.status(400).json({ message: "Невалидна сума" });
      }

      room.finance.expenses.unshift({
        amount: value,
        description: String(description || "").trim(),
        createdAt: new Date(),
      });

      room.finance.balance -= value;

      await room.save();
      res.json(room.finance);
    } catch (e) {
      res.status(500).json({ message: "Expense error", error: e.message });
    }
  }
);

export default router;
