console.log("VITE_API_URL =", import.meta.env.VITE_API_URL);

import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
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
  const navigate = useNavigate();
  const { token, user, fetchUser } = useAuth();
  const routeNavTimerRef = useRef(null);
  const [routeLeaving, setRouteLeaving] = useState(false);

  // крие Navbar само на началната, защото тя има собствен hero header
  const hideNavbar = location.pathname === "/";

  useEffect(() => {
    if (token && !user) fetchUser();
  }, [token, user, fetchUser]);

  useEffect(() => {
    return () => {
      if (routeNavTimerRef.current) {
        window.clearTimeout(routeNavTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return;

      const anchor = e.target?.closest?.("a[href]");
      if (!anchor) return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref) return;
      if (!rawHref.startsWith("/")) return;
      if (rawHref.startsWith("//")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let target;
      try {
        const u = new URL(anchor.href, window.location.origin);
        if (u.origin !== window.location.origin) return;
        target = `${u.pathname}${u.search}${u.hash}`;
      } catch {
        return;
      }

      const current = `${location.pathname}${location.search}${location.hash}`;
      if (target === current) return;

      e.preventDefault();

      if (typeof document !== "undefined" && "startViewTransition" in document) {
        document.startViewTransition(() => navigate(target));
        return;
      }

      setRouteLeaving(true);
      if (routeNavTimerRef.current) {
        window.clearTimeout(routeNavTimerRef.current);
      }
      routeNavTimerRef.current = window.setTimeout(() => {
        navigate(target);
      }, 230);
    };

    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [location.pathname, location.search, location.hash, navigate]);

  useEffect(() => {
    setRouteLeaving(false);
  }, [location.pathname, location.search, location.hash]);

  return (
    <div className={`app-shell min-h-screen flex flex-col ${routeLeaving ? "app-route-leaving" : ""}`}>
      {!hideNavbar && <Navbar />}

      <main className="app-main flex-1">
        <div key={`${location.pathname}${location.search}`} className="app-route-enter">
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
        </div>
      </main>

      {/* Глобален футър — винаги долу */}
      <SiteFooter />
    </div>
  );
}
