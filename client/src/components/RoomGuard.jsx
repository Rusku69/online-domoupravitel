import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../store/auth";

export default function RoomGuard({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const canAccessLockedSections = user?.role === "admin" || user?.memberStatus === "approved";

  if (!user?.roomId || !canAccessLockedSections) {
    return <Navigate to="/room" replace state={{ from: location }} />;
  }

  return children;
}
