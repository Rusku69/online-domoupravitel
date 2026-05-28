import express from "express";
import Room from "../models/Room.js";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import requireAuth from "../middleware/requireAuth.js";
import requireVerifiedManager from "../middleware/requireVerifiedManager.js";
import requireRoomActive from "../middleware/requireRoomActive.js";
import requireRoomEmailVerified from "../middleware/requireRoomEmailVerified.js";
import {
  apartmentSort,
  countPaidUnits,
  findUnavailableApartments,
  formatApartmentList,
  getMemberApartments,
  getOccupiedApartmentSet,
  listAvailableApartments,
  normalizeApartmentList,
  setManagerRequestApartments,
  setMemberApartments,
  setUserApartments,
  validateApartmentsAgainstCount,
} from "../src/utils/apartments.js";

const router = express.Router();

function makeCode(building, entrance) {
  const n = Math.floor(100000 + Math.random() * 900000);
  const b = String(building || "").toUpperCase().trim();
  const e = String(entrance || "").toUpperCase().trim();
  return `${b}-${e}-${n}`;
}

async function removeUserFromOtherRooms(userId, targetRoomId) {
  const rooms = await Room.find({
    _id: { $ne: targetRoomId },
    "members.user": userId,
  });

  for (const room of rooms) {
    const before = room.members.length;
    room.members = room.members.filter((m) => String(m.user) !== String(userId));
    if (room.members.length !== before) {
      await room.save();
    }
  }
}

function roomSubscription(room) {
  const now = new Date();
  const trialActive = !!(room.trialEndsAt && new Date(room.trialEndsAt) > now);
  const paidActive = !!(room.subscriptionExpires && new Date(room.subscriptionExpires) > now);

  return {
    trialEndsAt: room.trialEndsAt,
    subscriptionExpires: room.subscriptionExpires,
    active: trialActive || paidActive,
    trialActive,
    paidActive,
  };
}

function getRoomMember(room, userId) {
  return room.members.find((member) => String(member.user) === String(userId)) || null;
}

function buildPendingRoomView(room, member) {
  const apartments = getMemberApartments(member);

  return {
    _id: room._id,
    city: room.city,
    building: room.building,
    entrance: room.entrance,
    pendingView: true,
    pendingRequest: {
      status: member?.status || "pending",
      apartments,
      apartmentLabel: formatApartmentList(apartments),
    },
  };
}

async function clearUserRoomMembership(user) {
  user.roomId = null;
  user.memberStatus = "pending";
  user.city = "";
  user.building = "";
  user.entrance = "";
  setUserApartments(user, []);
  await user.save();
}

async function buildFinancePayload(room) {
  const finance = room?.finance || {};
  const expenses = Array.isArray(finance.expenses) ? finance.expenses : [];

  const payments = await Payment.find({ roomId: room._id }).select("amount paidBy apartment apartments");

  const collectedTotal = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0) * countPaidUnits(payment),
    0
  );
  const paidUnits = payments.reduce((sum, payment) => sum + countPaidUnits(payment), 0);
  const expensesTotal = expenses.reduce((sum, entry) => sum + Number(entry?.amount || 0), 0);

  const hasOpeningBalance = finance.openingBalance !== undefined && finance.openingBalance !== null;
  const rawOpeningBalance = hasOpeningBalance ? Number(finance.openingBalance) : NaN;
  const currentStoredBalance = Number(finance.balance || 0);
  const inferredOpeningBalance = currentStoredBalance - collectedTotal + expensesTotal;
  const openingBalance = Number.isFinite(rawOpeningBalance)
    ? rawOpeningBalance
    : finance.locked
    ? inferredOpeningBalance
    : currentStoredBalance;

  const balance = finance.locked
    ? openingBalance + collectedTotal - expensesTotal
    : currentStoredBalance;

  return {
    iban: finance.iban || "",
    holderName: finance.holderName || "",
    openingBalance,
    balance,
    locked: Boolean(finance.locked),
    expenses,
    collectedTotal,
    paidUnits,
    expensesTotal,
  };
}

async function syncFinanceSnapshot(room, payload) {
  if (!room?.finance?.locked) return payload;

  const shouldSetOpeningBalance =
    room.finance.openingBalance === undefined || room.finance.openingBalance === null;
  const shouldSetBalance = Number(room.finance.balance || 0) !== Number(payload.balance || 0);

  if (!shouldSetOpeningBalance && !shouldSetBalance) return payload;

  room.finance.openingBalance = Number(payload.openingBalance || 0);
  room.finance.balance = Number(payload.balance || 0);
  await room.save();

  return payload;
}

router.post("/manager-request", requireAuth, requireRoomEmailVerified, async (req, res) => {
  try {
    const u = req.user;

    if (u.role === "admin") {
      return res.status(400).json({ message: "Админът няма нужда от заявка." });
    }
    if (u.role === "manager") {
      return res.status(400).json({ message: "Вече сте домоуправител." });
    }

    const city = String(req.body.city || "").trim();
    const building = String(req.body.building || "").trim();
    const entrance = String(req.body.entrance || "").trim().toUpperCase();
    const apartments = normalizeApartmentList(req.body.apartments ?? req.body.apartment);

    if (!city || !building || !entrance) {
      return res.status(400).json({ message: "Попълни град, блок и вход." });
    }

    if (!apartments.length) {
      return res.status(400).json({ message: "Избери поне един апартамент." });
    }

    if (u.managerRequestStatus === "pending") {
      return res.status(400).json({ message: "Вече имаш изпратена заявка." });
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
    setManagerRequestApartments(u, apartments);
    u.managerRequestedAt = new Date();
    await u.save();

    res.json({ message: "Заявката е изпратена към Админ." });
  } catch (e) {
    res.status(500).json({ message: "Manager request error", error: e.message });
  }
});

router.get("/lookup", requireAuth, async (req, res) => {
  try {
    const code = String(req.query.code || "").trim();
    if (!code) return res.status(400).json({ message: "Липсва код" });

    const room = await Room.findOne({ code });
    if (!room) return res.status(404).json({ message: "Room not found" });

    const occupiedApartments = Array.from(getOccupiedApartmentSet(room)).sort(apartmentSort);

    res.json({
      roomId: room._id,
      city: room.city,
      building: room.building,
      entrance: room.entrance,
      apartmentsCount: room.apartmentsCount ?? null,
      occupiedApartments,
      availableApartments: listAvailableApartments(room),
    });
  } catch (e) {
    res.status(500).json({ message: "Room lookup error", error: e.message });
  }
});

router.get("/:roomId", requireAuth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId).populate("createdBy", "name email phone");
    if (!room) return res.status(404).json({ message: "Room not found" });

    const member = getRoomMember(room, req.user._id);
    const isMember = Boolean(member);
    if (!isMember && req.user.role !== "admin") {
      return res.status(403).json({ message: "Нямате достъп" });
    }

    const canSeeFullRoom =
      req.user.role === "admin" || req.user.role === "manager" || member?.status === "approved";

    if (!canSeeFullRoom) {
      return res.json(buildPendingRoomView(room, member));
    }

    const finance = await syncFinanceSnapshot(room, await buildFinancePayload(room));

    res.json({
      ...room.toObject(),
      finance,
      occupiedApartments: Array.from(getOccupiedApartmentSet(room)).sort(apartmentSort),
      availableApartments: listAvailableApartments(room),
      subscription: roomSubscription(room),
    });
  } catch (e) {
    res.status(500).json({ message: "Room load error", error: e.message });
  }
});

router.post("/join", requireAuth, async (req, res) => {
  try {
    const u = req.user;
    const code = String(req.body.code || "").trim();

    if (!code) return res.status(400).json({ message: "Липсва код" });

    const room = await Room.findOne({ code });
    if (!room) return res.status(404).json({ message: "Room not found" });

    const requestedApartments = normalizeApartmentList(req.body.apartments ?? req.body.apartment);

    if (u.role === "manager") {
      return res.status(403).json({
        message: "Домоуправителят не може да кандидатства за друг вход от този акаунт.",
      });
    }

    if (u.role !== "admin") {
      const validation = validateApartmentsAgainstCount(requestedApartments, room.apartmentsCount);
      if (!validation.ok) {
        return res.status(400).json({ message: validation.message });
      }

      const occupied = getOccupiedApartmentSet(room, { excludeUserId: u._id });
      const unavailable = findUnavailableApartments(validation.apartments, occupied);
      if (unavailable.length) {
        return res.status(409).json({
          message: `Тези апартаменти вече са заети: ${unavailable.join(", ")}.`,
          unavailableApartments: unavailable,
        });
      }
    }

    await removeUserFromOtherRooms(u._id, room._id);

    if (u.role === "admin") {
      u.roomId = room._id;
      u.memberStatus = "approved";
      u.city = room.city;
      u.building = room.building;
      u.entrance = room.entrance;
      setUserApartments(u, []);
      await u.save();

      return res.json({
        message: "Админът влезе във входа за поправка.",
        roomId: room._id,
        autoApproved: true,
      });
    }

    let member = room.members.find((m) => String(m.user) === String(u._id));

    if (member?.status === "approved") {
      return res.status(400).json({ message: "Вече сте одобрен член на тази стая." });
    }

    if (!member) {
      room.members.push({
        user: u._id,
        status: "pending",
        nameSnapshot: u.name || "",
        phoneSnapshot: u.phone || "",
        tenantTag: false,
      });
      member = room.members[room.members.length - 1];
    }

    setMemberApartments(member, requestedApartments);
    member.status = "pending";
    member.nameSnapshot = u.name || "";
    member.phoneSnapshot = u.phone || "";
    await room.save();

    u.roomId = room._id;
    u.memberStatus = "pending";
    u.city = room.city;
    u.building = room.building;
    u.entrance = room.entrance;
    setUserApartments(u, requestedApartments);
    await u.save();

    res.json({ message: "Заявката е изпратена.", roomId: room._id });
  } catch (e) {
    res.status(500).json({ message: "Join error", error: e.message });
  }
});

router.post("/leave", requireAuth, async (req, res) => {
  try {
    const u = req.user;

    if (u.role !== "admin") {
      return res.status(403).json({ message: "Само Админ може да излиза от стая по този начин." });
    }

    if (!u.roomId) {
      return res.json({ message: "Админът не е в стая.", roomId: null });
    }

    await clearUserRoomMembership(u);

    res.json({ message: "Излезе от стаята.", roomId: null });
  } catch (e) {
    res.status(500).json({ message: "Leave room error", error: e.message });
  }
});

router.post("/approve", requireAuth, requireVerifiedManager, requireRoomActive, async (req, res) => {
  try {
    const manager = req.user;
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({ message: "Missing memberId" });
    }

    const room = await Room.findById(manager.roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (String(room.createdBy) !== String(manager._id)) {
      return res.status(403).json({ message: "Нямате права" });
    }

    const member = room.members.find((x) => String(x.user) === String(memberId));
    if (!member) return res.status(404).json({ message: "Member not found" });

    const requestedApartments = getMemberApartments(member);
    if (!requestedApartments.length) {
      return res.status(400).json({ message: "Няма избрани апартаменти за тази заявка." });
    }

    const occupied = getOccupiedApartmentSet(room, { excludeUserId: memberId });
    const unavailable = findUnavailableApartments(requestedApartments, occupied);
    if (unavailable.length) {
      return res.status(409).json({
        message: `Тези апартаменти вече са заети: ${unavailable.join(", ")}.`,
        unavailableApartments: unavailable,
      });
    }

    member.status = "approved";
    await room.save();

    await removeUserFromOtherRooms(memberId, room._id);

    const memberUser = await User.findById(memberId);
    if (!memberUser) return res.status(404).json({ message: "User not found" });

    memberUser.memberStatus = "approved";
    memberUser.roomId = room._id;
    memberUser.city = room.city;
    memberUser.building = room.building;
    memberUser.entrance = room.entrance;
    setUserApartments(memberUser, requestedApartments);
    await memberUser.save();

    res.json({ message: "Approved" });
  } catch (e) {
    res.status(500).json({ message: "Approve error", error: e.message });
  }
});

router.post("/reject", requireAuth, requireVerifiedManager, requireRoomActive, async (req, res) => {
  try {
    const manager = req.user;
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({ message: "Missing memberId" });
    }

    const room = await Room.findById(manager.roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (String(room.createdBy) !== String(manager._id)) {
      return res.status(403).json({ message: "Нямате права" });
    }

    const member = getRoomMember(room, memberId);
    if (!member) return res.status(404).json({ message: "Member not found" });

    if (member.status !== "pending") {
      return res.status(400).json({ message: "Можеш да отхвърлиш само чакаща заявка." });
    }

    room.members = room.members.filter((entry) => String(entry.user) !== String(memberId));
    await room.save();

    const memberUser = await User.findById(memberId);
    if (memberUser && String(memberUser.roomId) === String(room._id)) {
      await clearUserRoomMembership(memberUser);
    }

    res.json({ message: "Rejected" });
  } catch (e) {
    res.status(500).json({ message: "Reject error", error: e.message });
  }
});

router.get("/:roomId/pending", requireAuth, requireRoomActive, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId).populate(
      "members.user",
      "name email phone apartment apartments"
    );
    if (!room) return res.status(404).json({ message: "Room not found" });

    const isAdmin = req.user.role === "admin";
    const isCreator = String(room.createdBy) === String(req.user._id);
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: "Нямате права" });
    }

    const pending = room.members
      .filter((m) => m.status === "pending")
      .map((m) => {
        const apartments = getMemberApartments(m);
        const u = m.user;

        return {
          _id: u?._id,
          name: m.nameSnapshot || u?.name || "—",
          email: u?.email || "—",
          phone: m.phoneSnapshot || u?.phone || "",
          apartment: m.apartment || u?.apartment || "",
          apartments,
          apartmentLabel: formatApartmentList(apartments),
        };
      });

    res.json(pending);
  } catch (e) {
    res.status(500).json({ message: "Pending error", error: e.message });
  }
});

router.get(
  "/:roomId/members",
  requireAuth,
  requireVerifiedManager,
  requireRoomActive,
  async (req, res) => {
    try {
      const room = await Room.findById(req.params.roomId)
        .populate("members.user", "name email phone apartment apartments role")
        .populate("createdBy", "name email phone");

      if (!room) return res.status(404).json({ message: "Room not found" });

      if (req.user.role !== "manager") {
        return res.status(403).json({ message: "Само домоуправител има достъп." });
      }

      if (String(room.createdBy._id) !== String(req.user._id)) {
        return res.status(403).json({ message: "Само създателят има достъп." });
      }

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
        members: room.members.map((m) => {
          const apartments = getMemberApartments(m);
          return {
            _id: m.user?._id,
            status: m.status,
            apartment: m.apartment || "",
            apartments,
            apartmentLabel: formatApartmentList(apartments),
            name: m.nameSnapshot || m.user?.name || "",
            email: m.user?.email || "",
            phone: m.phoneSnapshot || m.user?.phone || "",
            role: m.user?.role || "",
            tenantTag: !!m.tenantTag,
          };
        }),
      });
    } catch (e) {
      res.status(500).json({ message: "Members load error", error: e.message });
    }
  }
);

async function requireManagerCreator(req, res, roomId) {
  const room = await Room.findById(roomId);
  if (!room) {
    return { error: res.status(404).json({ message: "Room not found" }) };
  }

  if (req.user.role !== "manager") {
    return {
      error: res.status(403).json({ message: "Само домоуправител има достъп." }),
    };
  }

  if (String(room.createdBy) !== String(req.user._id)) {
    return {
      error: res.status(403).json({ message: "Само създателят може да управлява." }),
    };
  }

  return { room };
}

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

      const member = room.members.find((x) => String(x.user) === String(memberId));
      if (!member) return res.status(404).json({ message: "Member not found" });

      member.tenantTag =
        typeof req.body.tenantTag === "boolean" ? req.body.tenantTag : !member.tenantTag;

      await room.save();
      res.json({ message: "Запазено", tenantTag: member.tenantTag });
    } catch (e) {
      res.status(500).json({ message: "Tag error", error: e.message });
    }
  }
);

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
        return res.status(400).json({ message: "Не можеш да премахнеш себе си." });
      }

      const before = room.members.length;
      room.members = room.members.filter((m) => String(m.user) !== String(memberId));

      if (room.members.length === before) {
        return res.status(404).json({ message: "Member not found" });
      }

      await room.save();

      const u = await User.findById(memberId);
      if (u && String(u.roomId) === String(room._id)) {
        await clearUserRoomMembership(u);
      }

      res.json({ message: "Живущият е премахнат." });
    } catch (e) {
      res.status(500).json({ message: "Kick error", error: e.message });
    }
  }
);

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

  const occupied = Array.from(getOccupiedApartmentSet(room));
  const invalidOccupied = occupied.filter((apt) => /^\d+$/.test(apt) && Number(apt) > n);
  if (invalidOccupied.length) {
    return res.status(400).json({
      message: `Не може да намалиш броя под вече заетите апартаменти: ${invalidOccupied.join(", ")}.`,
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
    res.status(500).json({ message: "ApartmentsCount error", error: e.message });
  }
});

router.post("/:roomId/apartments-count", requireAuth, requireRoomActive, async (req, res) => {
  try {
    await setApartmentsCount(req, res);
  } catch (e) {
    res.status(500).json({ message: "ApartmentsCount error", error: e.message });
  }
});

router.get("/:roomId/finance", requireAuth, requireRoomActive, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const isAdmin = req.user.role === "admin";
    const isCreator = String(room.createdBy) === String(req.user._id);

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: "Нямате права" });
    }

    const payload = await syncFinanceSnapshot(room, await buildFinancePayload(room));
    res.json(payload);
  } catch (e) {
    res.status(500).json({ message: "Finance load error", error: e.message });
  }
});

router.patch("/:roomId/finance/admin-payout", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Само Админ има достъп." });
    }

    if (!req.user.roomId || String(req.user.roomId) !== String(req.params.roomId)) {
      return res.status(403).json({ message: "Първо влез в тази стая като Админ." });
    }

    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const cleanIban = String(req.body.iban || "").trim();
    const cleanHolder = String(req.body.holderName || "").trim();

    if (!cleanHolder) {
      return res.status(400).json({ message: "Липсва име на получателя" });
    }
    if (!cleanIban || cleanIban.length < 10) {
      return res.status(400).json({ message: "Невалиден IBAN" });
    }

    const financeSnapshot = await buildFinancePayload(room);

    room.finance = {
      iban: cleanIban,
      holderName: cleanHolder,
      openingBalance: Number(financeSnapshot.openingBalance || 0),
      balance: Number(financeSnapshot.balance || 0),
      locked: Boolean(room.finance?.locked),
      expenses: Array.isArray(room.finance?.expenses) ? room.finance.expenses : [],
    };

    await room.save();
    const finance = await syncFinanceSnapshot(room, await buildFinancePayload(room));

    res.json({
      message: "IBAN/получател са обновени от Админ.",
      finance,
    });
  } catch (e) {
    res.status(500).json({ message: "Admin payout override error", error: e.message });
  }
});

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
        openingBalance: start,
        balance: start,
        locked: true,
        expenses: [],
      };

      await room.save();
      res.json(await buildFinancePayload(room));
    } catch (e) {
      res.status(500).json({ message: "Finance lock error", error: e.message });
    }
  }
);

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
      res.json(await buildFinancePayload(room));
    } catch (e) {
      res.status(500).json({ message: "Expense error", error: e.message });
    }
  }
);

export default router;
