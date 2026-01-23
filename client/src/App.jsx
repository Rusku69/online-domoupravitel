console.log("VITE_API_URL =", import.meta.env.VITE_API_URL);

import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./store/auth";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import RoomGuard from "./components/RoomGuard";
import SiteFooter from "./components/SiteFooter";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

import Dashboard from "./pages/Dashboard";
import Room from "./pages/Room";
import Announcements from "./pages/Announcements";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
import Signals from "./pages/Signals";
import Checkout from "./pages/Checkout";
import Subscription from "./pages/Subscription";
import Admin from "./pages/Admin";
import Residents from "./pages/Residents";
import Account from "./pages/Account";
import AdminRooms from "./pages/AdminRooms";
import VerifyEmail from "./pages/VerifyEmail";
import ResetPassword from "./pages/ResetPassword";
import ForgotPassword from "./pages/ForgotPassword";

export default function App() {
  const location = useLocation();
  const { token, user, fetchUser } = useAuth();

  // крие Navbar на публичните страници
  const hideNavbar = ["/", "/login", "/register"].includes(location.pathname);

  useEffect(() => {
    if (token && !user) fetchUser();
  }, [token, user, fetchUser]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {!hideNavbar && <Navbar />}

      <main className="flex-1">
        <Routes>
          {/* Landing */}
          <Route path="/" element={<Home />} />

          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Email / Password flows (public) */}
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected (logged in) */}
          <Route
            path="/room"
            element={
              <ProtectedRoute>
                <Room />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoomGuard>
                  <Dashboard />
                </RoomGuard>
              </ProtectedRoute>
            }
          />

          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />

          {/* RoomGuard секции */}
          <Route
            path="/announcements"
            element={
              <ProtectedRoute>
                <RoomGuard>
                  <Announcements />
                </RoomGuard>
              </ProtectedRoute>
            }
          />

          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <RoomGuard>
                  <Payments />
                </RoomGuard>
              </ProtectedRoute>
            }
          />

          <Route
            path="/signals"
            element={
              <ProtectedRoute>
                <RoomGuard>
                  <Signals />
                </RoomGuard>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <RoomGuard>
                  <Reports />
                </RoomGuard>
              </ProtectedRoute>
            }
          />

          <Route
            path="/residents"
            element={
              <ProtectedRoute>
                <RoomGuard>
                  <Residents />
                </RoomGuard>
              </ProtectedRoute>
            }
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/rooms"
            element={
              <ProtectedRoute>
                <AdminRooms />
              </ProtectedRoute>
            }
          />

          {/* Stripe flow */}
          <Route
            path="/checkout/:id"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />

          <Route
            path="/subscription"
            element={
              <ProtectedRoute>
                <Subscription />
              </ProtectedRoute>
            }
          />

          {/* fallback */}
          <Route path="*" element={<div className="p-6">404 - Страницата не е намерена</div>} />
        </Routes>
      </main>

      {/* Глобален футър — винаги долу */}
      <SiteFooter />
    </div>
  );
}
