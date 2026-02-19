export function roleLabel(role) {
  const key = String(role || "").toLowerCase();
  if (key === "admin") return "Админ";
  if (key === "manager") return "Домоуправител";
  if (key === "resident") return "Живущ";
  return role || "—";
}
