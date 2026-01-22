import mongoose from "mongoose";
import dotenv from "dotenv";

import User from "../models/User.js";
import Room from "../models/Room.js";
import Payment from "../models/Payment.js";
import Announcement from "../models/Announcement.js";
import Signal from "../models/Signal.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Mongo connected");

  await Promise.all([
    User.deleteMany({ role: { $ne: "admin" } }), // пазим админа
    Room.deleteMany({}),
    Payment.deleteMany({}),
    Announcement.deleteMany({}),
    Signal.deleteMany({}),
  ]);

  console.log("✅ DB reset done (admin kept)");
  process.exit(0);
}

run().catch((e) => {
  console.error("❌ reset error:", e);
  process.exit(1);
});
