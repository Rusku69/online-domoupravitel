export function roleLabel(role, user = null) {
  const key = String(role || "").toLowerCase();
  if (key === "admin") return "Админ";
  if (key === "manager") return "Домоуправител";
  if (key === "resident") {
    if (user?.managerRequestStatus === "pending") return "Кандидат домоуправител";
    if (!user?.roomId && (!user?.managerRequestStatus || user.managerRequestStatus === "none")) {
      return "Потребител";
    }
    return "Живущ";
  }
  return role || "—";
}
