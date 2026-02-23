import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import Stripe from "stripe";

import authRoutes from "../routes/auth.js";
import announcementRoutes from "../routes/announcements.js";
import paymentRoutes from "../routes/payments.js";
import reportsRoutes from "../routes/reports.js";
import signalRoutes from "../routes/signals.js";
import roomRoutes from "../routes/rooms.js";
import adminRoutes from "../routes/admin.js";
import dashboardRoutes from "../routes/dashboard.js";

import { migrateRooms } from "./utils/migrateRooms.js";
import adminRoomsRoutes from "../routes/adminRooms.js";
import subscriptionRoutes from "../routes/subscription.js";

import Payment from "../models/Payment.js";
import Room from "../models/Room.js";

dotenv.config();

console.log("ENV CHECK:", {
  mongo: !!process.env.MONGO_URI,
  stripe: (process.env.STRIPE_SECRET_KEY || "").slice(0, 8),
  hasStripe: !!process.env.STRIPE_SECRET_KEY,
});

const app = express();

// ✅ CORS (ако ти трябва със специфични домейни, ще го затегнем по-късно)
app.use(cors());

// =======================================================
// ✅ STRIPE WEBHOOK (RAW BODY) — трябва да е ПРЕДИ express.json()
// =======================================================
const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2024-06-20" }) : null;

function extendRoomSubscription(room, months) {
  const m = Number(months);
  if (!Number.isFinite(m) || m < 1 || m > 24) return null;

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
  return next;
}

app.post(
  "/api/payments/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      if (!stripe) return res.status(500).send("Stripe not configured");
      if (!stripeWebhookSecret) return res.status(500).send("Missing STRIPE_WEBHOOK_SECRET");

      const sig = req.headers["stripe-signature"];
      let event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
      } catch (e) {
        console.error("❌ webhook signature error:", e.message);
        return res.status(400).send(`Webhook Error: ${e.message}`);
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const kind = String(session?.metadata?.kind || "");

        const paymentId = session?.metadata?.paymentId;
        const roomId = session?.metadata?.roomId;
        const userId = session?.metadata?.userId;

        if (paymentId && roomId && userId) {
          const payment = await Payment.findById(paymentId);
          if (payment && String(payment.roomId) === String(roomId)) {
            const alreadyPaid = (payment.paidBy || []).some(
              (x) => String(x.user) === String(userId)
            );

            if (!alreadyPaid) {
              // ✅ взимаме last4/brand от PaymentIntent
              let cardLast4 = "";
              let cardBrand = "";

              const paymentIntentId = session.payment_intent ? String(session.payment_intent) : "";

              if (paymentIntentId) {
                try {
                  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
                    expand: ["charges.data.payment_method_details"],
                  });

                  const ch = pi?.charges?.data?.[0];
                  const card = ch?.payment_method_details?.card;

                  if (card?.last4) cardLast4 = String(card.last4);
                  if (card?.brand) cardBrand = String(card.brand);
                } catch (e) {
                  console.error("⚠️ Could not fetch PaymentIntent details:", e?.message);
                }
              }

              // ✅ записваме плащането
              payment.paidBy.push({
                user: userId,
                method: "stripe",
                paidAt: new Date(),
                stripeSessionId: session.id,
                stripePaymentIntentId: paymentIntentId || "",
                cardLast4,
                cardBrand,
              });

              // (по желание) ако искаш общ статус да става "paid" когато НЯКОЙ плати - оставяме старото
              // payment.status = "paid";
              // payment.paidAt = new Date();

              await payment.save();

              const room = await Room.findById(roomId);
              if (room?.finance?.locked) {
                room.finance.balance =
                  Number(room.finance.balance || 0) + Number(payment.amount || 0);
                await room.save();
              }
            }
          }
        }

        if (kind === "room_subscription_renewal") {
          const renewRoomId = String(session?.metadata?.roomId || "");
          const renewUserId = String(session?.metadata?.userId || "");
          const renewMonths = Number(session?.metadata?.months || 0);
          const renewApartments = Number(session?.metadata?.apartmentsCount || 0);
          const renewAmountEur = Number(session?.metadata?.totalAmountEur || 0);

          if (renewRoomId && renewUserId && Number.isFinite(renewMonths) && renewMonths > 0) {
            const room = await Room.findById(renewRoomId);
            if (room) {
              room.subscriptionRenewals = Array.isArray(room.subscriptionRenewals) ? room.subscriptionRenewals : [];

              const alreadyProcessed = room.subscriptionRenewals.some(
                (x) => String(x?.stripeSessionId || "") === String(session.id)
              );

              if (!alreadyProcessed) {
                const next = extendRoomSubscription(room, renewMonths);

                if (next) {
                  room.subscriptionRenewals.push({
                    stripeSessionId: String(session.id || ""),
                    byUser: renewUserId || null,
                    months: renewMonths,
                    apartmentsCount: Number.isFinite(renewApartments) ? renewApartments : 0,
                    amountEur: Number.isFinite(renewAmountEur) ? renewAmountEur : 0,
                    createdAt: new Date(),
                  });

                  await room.save();
                }
              }
            }
          }
        }
      }

      return res.json({ received: true });
    } catch (err) {
      console.error("❌ webhook handler error:", err);
      return res.status(500).send("Webhook handler error");
    }
  }
);

// =======================================================
// ✅ JSON body за всички останали routes
// =======================================================
app.use(express.json());

// тест
app.get("/", (req, res) => res.send("✅ Server is running..."));

// ✅ РУТЕСИ
app.use("/api/auth", authRoutes);
app.use("/api/announcements", announcementRoutes);

// ⚠️ paymentsRoutes вече НЕ трябва да дефинира /stripe/webhook вътре,
// но дори да го има — няма да стигне до него, защото този горе е по-рано.
app.use("/api/payments", paymentRoutes);

app.use("/api/reports", reportsRoutes);
app.use("/api/signals", signalRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoomsRoutes);
app.use("/api/subscription", subscriptionRoutes);

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ Mongo connected");

    // ✅ миграция без Compass
    await migrateRooms();

    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  })
  .catch((err) => console.error("❌ DB connection error:", err));
