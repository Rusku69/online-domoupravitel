import { create } from "zustand";
import api from "../lib/api";

function normalizePaid(user) {
  if (!user) return user;
  const now = new Date();
  const expires = user.subscriptionExpires ? new Date(user.subscriptionExpires) : null;
  const stillActive = !!(expires && expires > now);

  const isPaid = expires ? stillActive : !!user.isPaid;

  return { ...user, isPaid };
}

export const useAuth = create((set, get) => ({
  user: null,
  token: localStorage.getItem("token") || null,
  loading: false,
  error: null,

  setToken: (token) => {
    if (token) {
      localStorage.setItem("token", token);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      localStorage.removeItem("token");
      delete api.defaults.headers.common["Authorization"];
    }
    set({ token });
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post("/api/auth/login", { email, password });
      const { token, user } = res.data;

      get().setToken(token);

      set({
        user: normalizePaid(user),
        loading: false,
      });

      return true;
    } catch (err) {
      set({
        error: err?.response?.data?.message || "Грешка при вход",
        loading: false,
      });
      return false;
    }
  },

  register: async (payload) => {
    set({ loading: true, error: null });
    try {
      await api.post("/api/auth/register", payload);
      set({ loading: false });
      return true;
    } catch (err) {
      set({
        error: err?.response?.data?.message || "Грешка при регистрация",
        loading: false,
      });
      return false;
    }
  },

  logout: () => {
    get().setToken(null);
    set({ user: null });
  },

  fetchUser: async () => {
    try {
      const { token } = get();
      if (!token) return;

      const res = await api.get("/api/auth/me");
      const u = res.data;

      set({ user: { ...u, id: u._id } });
    } catch (err) {
      console.error("❌ Грешка при презареждане на потребителя");
    }
  },
}));
