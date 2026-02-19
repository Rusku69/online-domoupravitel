import shouldRequireRoomEmailVerify from "./shouldRequireRoomEmailVerify.js";

export default function requireRoomEmailVerified(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Няма потребител" });

  // Нови акаунти: задължително verify email преди room actions.
  // Старите акаунти остават съвместими.
  const mustVerify = shouldRequireRoomEmailVerify(req.user);
  if (mustVerify && !req.user.emailVerified) {
    return res.status(403).json({
      message: "Потвърди имейла си, за да влизаш в стая или да подаваш заявка за домоуправител.",
      code: "EMAIL_NOT_VERIFIED_REQUIRED",
    });
  }

  next();
}
