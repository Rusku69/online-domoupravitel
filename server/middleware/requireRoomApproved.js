import Room from "../models/Room.js";

export default async function requireRoomApproved(req, res, next) {
  try {
    if (!req.user?.roomId) {
      return res.status(403).json({ message: "Нямате избрана стая" });
    }
    if (req.user.memberStatus !== "approved") {
      return res.status(403).json({ message: "Профилът не е одобрен за стаята" });
    }

    // за удобство на другите middleware-та
    const room = await Room.findById(req.user.roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    req.room = room;
    next();
  } catch (e) {
    return res.status(500).json({ message: "Room approval check error", error: e.message });
  }
}
