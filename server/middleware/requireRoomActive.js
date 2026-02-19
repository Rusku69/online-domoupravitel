import Room from "../models/Room.js";

export default async function requireRoomActive(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Няма потребител" });
    if (!req.user.roomId) return res.status(403).json({ message: "Нямате избрана стая" });

    const isResident = String(req.user.role || "").toLowerCase() === "resident";

    // ✅ Resident трябва да е одобрен
    // (manager/admin може да минава дори ако memberStatus е крив)
    if (isResident) {
      if (req.user.memberStatus !== "approved") {
        return res.status(403).json({ message: "Профилът не е одобрен за стаята" });
      }
    }

    const room = await Room.findById(req.user.roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const now = new Date();
    const trialActive = !!(room.trialEndsAt && new Date(room.trialEndsAt) > now);
    const paidActive = !!(room.subscriptionExpires && new Date(room.subscriptionExpires) > now);
    const active = trialActive || paidActive;

    // ✅ room info в req (винаги)
    req.room = room;
    req.roomSubscription = {
      active,
      trialActive,
      paidActive,
      trialEndsAt: room.trialEndsAt,
      subscriptionExpires: room.subscriptionExpires,
    };

    // ✅ ако НЕ е активен входът: секциите остават заключени,
    // докато не се поднови абонаментът.
    if (!active) {
      return res.status(402).json({
        message: "Входът не е активен (trial/абонамент изтекъл).",
        subscription: req.roomSubscription,
      });
    }

    next();
  } catch (e) {
    console.error("requireRoomActive error:", e);
    return res.status(500).json({ message: "Грешка при проверка на абонамента", error: e.message });
  }
}
