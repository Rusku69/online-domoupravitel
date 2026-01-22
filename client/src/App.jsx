import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./store/auth";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

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
import RoomGuard from "./components/RoomGuard";



export default function App() {
  const location = useLocation();
  const { token, user, fetchUser } = useAuth();

  // ✅ крие Navbar на публичните страници
  const hideNavbar = ["/", "/login", "/register"].includes(location.pathname);

  useEffect(() => {
    if (token && !user) fetchUser();
  }, [token, user, fetchUser]);

  return (
    <div className="min-h-screen flex flex-col">
      {!hideNavbar && <Navbar />}

      <main className="flex-1">
        <Routes>
          {/* ✅ Landing */}
          <Route path="/" element={<Home />} />

          {/* ✅ Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* ✅ Protected */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/verify-email" element={<VerifyEmail />} />
<Route path="/reset-password" element={<ResetPassword />} />
<Route path="/forgot-password" element={<ForgotPassword />} />


          <Route
  path="/admin/rooms"
  element={
    <ProtectedRoute>
      <AdminRooms />
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

// room си остава само ProtectedRoute (за да може да влезе в стая)
<Route
  path="/room"
  element={
    <ProtectedRoute>
      <Room />
    </ProtectedRoute>
  }
/>

// ✅ Account трябва да е винаги достъпен за логнат
<Route
  path="/account"
  element={
    <ProtectedRoute>
      <Account />
    </ProtectedRoute>
  }
/>



          <Route
            path="/room"
            element={
              <ProtectedRoute>
                <Room />
              </ProtectedRoute>
            }
          />

          <Route
  path="/residents"
  element={
    <ProtectedRoute>
      <Residents />
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

          <Route
            path="/announcements"
            element={
              <ProtectedRoute>
                <Announcements />
              </ProtectedRoute>
            }
          />

          <Route
  path="/admin"
  element={
    <ProtectedRoute>
      <Admin />
    </ProtectedRoute>
  }
/>


          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <Payments />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />

          <Route
            path="/signals"
            element={
              <ProtectedRoute>
                <Signals />
              </ProtectedRoute>
            }
          />

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
    </div>
  );
}
