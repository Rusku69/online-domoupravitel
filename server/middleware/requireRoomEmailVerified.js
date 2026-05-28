import shouldRequireRoomEmailVerify from "./shouldRequireRoomEmailVerify.js";

export default function requireRoomEmailVerified(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Няма потребител" });

  // Newer accounts must verify email before sending a manager request.
  // Older accounts remain backward compatible.
  const mustVerify = shouldRequireRoomEmailVerify(req.user);
  if (mustVerify && !req.user.emailVerified) {
    return res.status(403).json({
      message: "Потвърди имейла си, за да подаваш заявка за домоуправител.",
      code: "EMAIL_NOT_VERIFIED_REQUIRED",
    });
  }

  next();
}
