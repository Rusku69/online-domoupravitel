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

export function firstApartment(value) {
  return normalizeApartmentList(value)[0] || "";
}

export function formatApartmentList(value) {
  return normalizeApartmentList(value).join(", ");
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

export function getManagerRequestApartments(user) {
  const direct = normalizeApartmentList(user?.managerRequestApartments);
  if (direct.length) return direct;
  return normalizeApartmentList(user?.managerRequestApartment);
}

export function setUserApartments(user, apartments) {
  const list = normalizeApartmentList(apartments);
  user.apartments = list;
  user.apartment = list[0] || "";
  return list;
}

export function setMemberApartments(member, apartments) {
  const list = normalizeApartmentList(apartments);
  member.apartments = list;
  member.apartment = list[0] || "";
  return list;
}

export function setManagerRequestApartments(user, apartments) {
  const list = normalizeApartmentList(apartments);
  user.managerRequestApartments = list;
  user.managerRequestApartment = list[0] || "";
  return list;
}

export function getPaymentTargetApartments(payment) {
  const direct = normalizeApartmentList(payment?.apartments);
  if (direct.length) return direct;
  return normalizeApartmentList(payment?.apartment);
}

export function isUniversalPayment(payment) {
  return getPaymentTargetApartments(payment).length === 0;
}

export function getPaidEntryApartments(entry) {
  const direct = normalizeApartmentList(entry?.apartments);
  if (direct.length) return direct;

  const fromUser = getUserApartments(entry?.user);
  if (fromUser.length) return fromUser;

  return normalizeApartmentList(entry?.apartment);
}

export function buildPaidApartmentSet(payment) {
  const out = new Set();

  for (const entry of payment?.paidBy || []) {
    for (const apt of getPaidEntryApartments(entry)) {
      out.add(apt);
    }
  }

  return out;
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

export function countPaidUnits(payment) {
  let total = 0;

  for (const entry of payment?.paidBy || []) {
    const apartments = getPaidEntryApartments(entry);
    total += apartments.length || 1;
  }

  return total;
}

export function getOccupiedApartmentSet(room, { excludeUserId = null, includePending = false } = {}) {
  const out = new Set();
  const skipId = excludeUserId ? String(excludeUserId) : "";

  for (const member of room?.members || []) {
    const memberUserId = String(member?.user?._id || member?.user || "");
    if (skipId && memberUserId === skipId) continue;
    if (!includePending && member?.status !== "approved") continue;

    for (const apt of getMemberApartments(member)) {
      out.add(apt);
    }
  }

  return out;
}

export function listAvailableApartments(room, options = {}) {
  const total = Number(room?.apartmentsCount || 0);
  if (!Number.isInteger(total) || total <= 0) return [];

  const occupied = getOccupiedApartmentSet(room, options);
  const out = [];

  for (let i = 1; i <= total; i += 1) {
    const apt = String(i);
    if (!occupied.has(apt)) out.push(apt);
  }

  return out;
}

export function validateApartmentsAgainstCount(apartments, count) {
  const list = normalizeApartmentList(apartments);
  const total = Number(count);

  if (!Number.isInteger(total) || total <= 0) {
    return {
      ok: false,
      message: "За тази стая още няма зададен валиден брой апартаменти.",
      apartments: [],
    };
  }

  if (!list.length) {
    return {
      ok: false,
      message: "Избери поне един апартамент.",
      apartments: [],
    };
  }

  for (const apt of list) {
    if (!/^\d+$/.test(apt)) {
      return {
        ok: false,
        message: "Апартаментите трябва да са числа от зададения списък.",
        apartments: [],
      };
    }

    const n = Number(apt);
    if (n < 1 || n > total) {
      return {
        ok: false,
        message: `Невалиден апартамент: ${apt}.`,
        apartments: [],
      };
    }
  }

  return { ok: true, message: "", apartments: list };
}

export function findUnavailableApartments(apartments, occupiedSet) {
  return normalizeApartmentList(apartments).filter((apt) => occupiedSet.has(apt));
}
