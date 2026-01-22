import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../store/auth";

export default function RoomGuard({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  // ако няма roomId -> пращаме към /room да си влезе в стая
  if (!user?.roomId) {
    return <Navigate to="/room" replace state={{ from: location }} />;
  }

  return children;
}
