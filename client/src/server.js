import User from "../models/User.js";

setInterval(async () => {
  const now = new Date();
  await User.updateMany(
    { isPaid: true, subscriptionExpires: { $lt: now } },
    { $set: { isPaid: false } }
  );
  console.log("🕓 Проверка за изтекли абонаменти...");
}, 12 * 60 * 60 * 1000);
