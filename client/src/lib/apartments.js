const SPLIT_RE = /[,\n;]+/;

export function apartmentSort(a, b) {
  return String(a || "").localeCompare(String(b || ""), "bg", {
    numeric: true,
    sensitivity: "base",
  });
}

export function normalizeApartmentList(value) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
    ? value.split(SPLIT_RE)
    : value === undefined || value === null
    ? []
    : [value];

  const out = [];
  const seen = new Set();

  for (const item of raw) {
    const clean = String(item || "").trim();
    if (!clean) continue;

    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }

  out.sort(apartmentSort);
  return out;
}

export function getUserApartments(user) {
  const direct = normalizeApartmentList(user?.apartments);
  if (direct.length) return direct;
  return normalizeApartmentList(user?.apartment);
}

export function getMemberApartments(member) {
  const direct = normalizeApartmentList(member?.apartments);
  if (direct.length) return direct;
  return normalizeApartmentList(member?.apartment);
}

export function formatApartmentList(value, fallback = "—") {
  const list = Array.isArray(value) ? normalizeApartmentList(value) : getMemberApartments(value);
  return list.length ? list.join(", ") : fallback;
}

export function getPaymentTargetApartments(payment) {
  const direct = normalizeApartmentList(payment?.apartments);
  if (direct.length) return direct;
  return normalizeApartmentList(payment?.apartment);
}

export function isUniversalPayment(payment) {
  return getPaymentTargetApartments(payment).length === 0;
}

export function paymentScopeLabel(payment) {
  const target = getPaymentTargetApartments(payment);
  return target.length ? `Само за ап. ${target.join(", ")}` : "За всички апартаменти";
}

export function getPaidEntryApartments(entry) {
  const direct = normalizeApartmentList(entry?.apartments);
  if (direct.length) return direct;

  const fromUser = getUserApartments(entry?.user);
  if (fromUser.length) return fromUser;

  return normalizeApartmentList(entry?.apartment);
}

export function getPaidApartmentsForUser(payment, userOrId) {
  const userId = String(userOrId?._id || userOrId?.id || userOrId || "");
  const out = new Set();

  for (const entry of payment?.paidBy || []) {
    const paidById = String(entry?.user?._id || entry?.user || "");
    if (!userId || paidById !== userId) continue;

    for (const apt of getPaidEntryApartments(entry)) {
      out.add(apt);
    }
  }

  return Array.from(out).sort(apartmentSort);
}

export function getOwedApartmentsForUser(payment, user) {
  const owned = getUserApartments(user);
  const target = getPaymentTargetApartments(payment);

  if (!owned.length) return [];
  if (!target.length) return owned;
  return owned.filter((apt) => target.includes(apt));
}

export function getOutstandingApartmentsForUser(payment, user) {
  const owed = getOwedApartmentsForUser(payment, user);
  const paid = new Set(getPaidApartmentsForUser(payment, user));
  return owed.filter((apt) => !paid.has(apt));
}

export function countPaidUnits(payment) {
  let total = 0;

  for (const entry of payment?.paidBy || []) {
    const apartments = getPaidEntryApartments(entry);
    total += apartments.length || 1;
  }

  return total;
}
