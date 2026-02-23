import express from "express";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import User from "../models/User.js";
import Room from "../models/Room.js";

const router = express.Router();
const PRICE_PER_APARTMENT_EUR = 1;
const APP_URL = process.env.APP_URL || "http://localhost:5173";
const STRIPE_CURRENCY = "eur";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

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

// ✅ renew room subscription (manager/admin only) -> Stripe Checkout
router.post("/renew", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "manager" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Само домоуправител/Админ може да подновява" });
    }
    if (!req.user.roomId) return res.status(400).json({ message: "Нямате стая" });

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
    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).json({ message: "Stripe не е конфигуриран (липсва STRIPE_SECRET_KEY)." });
    }

    const unitAmountCents = Math.round(totalAmountEur * 100);

    const roomLabel = [room.city, `Блок ${room.building}`, `Вход ${room.entrance}`].filter(Boolean).join(" • ");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: STRIPE_CURRENCY,
            unit_amount: unitAmountCents,
            product_data: {
              name: `Подновяване на абонамент (${m} мес.)`,
              description: roomLabel || "Абонамент за вход",
            },
          },
        },
      ],
      success_url: `${APP_URL}/subscription?paid=1`,
      cancel_url: `${APP_URL}/subscription?canceled=1`,
      metadata: {
        kind: "room_subscription_renewal",
        roomId: String(room._id),
        userId: String(req.user._id),
        months: String(m),
        apartmentsCount: String(apartmentsCount),
        pricePerApartmentEur: String(PRICE_PER_APARTMENT_EUR),
        totalAmountEur: totalAmountEur.toFixed(2),
      },
      customer_email: req.user.email || undefined,
    });

    res.json({
      message: "Stripe Checkout е създаден.",
      url: session.url,
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
