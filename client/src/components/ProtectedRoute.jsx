import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../store/auth";

export default function ProtectedRoute({ children }) {
  const { token, user } = useAuth();
  const location = useLocation();

  // ако няма токен => към login
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // имаме токен, но user още не е зареден -> може да покажеш loader
  if (!user) {
    return (
      <div className="p-6 text-sm text-slate-600">
        Зареждане...
      </div>
    );
  }

  // тук НЯМА проверки за roomId / memberStatus
  return children;
}
