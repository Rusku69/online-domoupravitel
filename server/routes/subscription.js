import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Room from "../models/Room.js";

const router = express.Router();
const PRICE_PER_APARTMENT_EUR = 1;

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
      return res.status(403).json({ message: "Само домоуправител/Админ може да подновява" });
    }
    if (!req.user.roomId) return res.status(400).json({ message: "Нямате стая" });

    // simple renew flow (без отделен payment method екран)
    const { months = 1 } = req.body;

    const m = Number(months);
    if (!Number.isFinite(m) || m < 1 || m > 24) {
      return res.status(400).json({ message: "Невалиден период (1-24 месеца)" });
    }

    const room = await Room.findById(req.user.roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const apartmentsCount = Number(room.apartmentsCount);
    if (!Number.isInteger(apartmentsCount) || apartmentsCount <= 0) {
      return res.status(400).json({
        message: "Първо трябва да е зададен валиден брой апартаменти за стаята.",
      });
    }

    const totalAmountEur = apartmentsCount * PRICE_PER_APARTMENT_EUR * m;

    // удължаваме от най-късната активна дата:
    // now, текущ платен период или активен trial
    const now = new Date();
    const baseCandidates = [now];
    if (room.subscriptionExpires && new Date(room.subscriptionExpires) > now) {
      baseCandidates.push(new Date(room.subscriptionExpires));
    }
    if (room.trialEndsAt && new Date(room.trialEndsAt) > now) {
      baseCandidates.push(new Date(room.trialEndsAt));
    }
    const base = new Date(Math.max(...baseCandidates.map((d) => d.getTime())));

    const next = new Date(base);
    next.setMonth(next.getMonth() + m);

    room.subscriptionExpires = next;
    await room.save();

    res.json({
      message: `✅ Подновено за ${m} месец(а) • сума ${totalAmountEur.toFixed(2)} €`,
      subscriptionExpires: room.subscriptionExpires,
      pricing: {
        pricePerApartmentEur: PRICE_PER_APARTMENT_EUR,
        apartmentsCount,
        months: m,
        totalAmountEur,
      },
    });
  } catch (e) {
    res.status(500).json({ message: "Renew error", error: e.message });
  }
});

export default router;
