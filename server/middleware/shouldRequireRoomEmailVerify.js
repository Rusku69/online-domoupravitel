const DEFAULT_ENFORCE_FROM = "2026-02-12T00:00:00.000Z";

function parseDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function shouldRequireRoomEmailVerify(user) {
  if (!user) return false;

  if (user.mustVerifyEmailForRoomActions === true) return true;
  if (user.mustVerifyEmailForRoomActions === false) return false;

  const enforceFromRaw = process.env.ROOM_EMAIL_VERIFY_ENFORCE_FROM || DEFAULT_ENFORCE_FROM;
  const enforceFrom = parseDate(enforceFromRaw);
  if (!enforceFrom) return false;

  const createdAt = parseDate(user.createdAt);
  if (!createdAt) return false;

  return createdAt >= enforceFrom;
}

