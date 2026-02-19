import shouldRequireRoomEmailVerify from "./shouldRequireRoomEmailVerify.js";

export default function requireVerifiedManager(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Няма потребител" });

  const mustVerify = shouldRequireRoomEmailVerify(req.user);
  if (req.user.role === "manager" && mustVerify && !req.user.emailVerified) {
    return res.status(403).json({
      message: "За домоуправители е задължително да потвърдите имейла си.",
      code: "EMAIL_NOT_VERIFIED",
    });
  }

  next();
}
