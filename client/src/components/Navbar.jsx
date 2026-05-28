import { Link, NavLink, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "../store/auth";
import { roleLabel } from "../lib/roles";
import { navigateWithTransition } from "../lib/viewTransition";

function Item({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `block px-3 py-2 rounded-2xl text-sm font-semibold border transition ${
          isActive
            ? "text-[#f4ffe8] border-[rgba(7,49,74,0.4)] bg-[linear-gradient(135deg,#0a4a79_0%,#0f6c5b_55%,#5b9d27_100%)] shadow-[0_10px_24px_rgba(7,49,74,0.24)]"
            : "border-transparent text-slate-700 hover:text-slate-900 hover:bg-white/80 hover:border-emerald-200/90"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

function GhostBtn({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl px-4 py-2 text-sm font-semibold border border-[rgba(11,69,50,0.28)] text-[#0f3f35] bg-[rgba(252,255,248,0.78)] hover:bg-white/95 transition shadow-sm"
    >
      {children}
    </button>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const hasRoom = !!user?.roomId;
  const approved = user?.memberStatus === "approved";
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const pendingRoomApproval = !!user && hasRoom && !approved && !isAdmin;

  const closeAll = () => {
    setMobileOpen(false);
    setMoreOpen(false);
  };

  const links = useMemo(() => {
    const out = [];

    out.push({ to: "/room", label: isAdmin ? "Влез и поправи" : "Стая", show: !!user });
    out.push({
      to: "/dashboard",
      label: "Табло",
      show: !!user && !isAdmin && hasRoom && approved,
    });
    out.push({ to: "/account", label: "Акаунт", show: !!user && !pendingRoomApproval });

    // approved sections (still only when hasRoom+approved)
    out.push({ to: "/announcements", label: "Обяви", show: !!user && !isAdmin && hasRoom && approved });
    out.push({ to: "/payments", label: "Плащания", show: !!user && !isAdmin && hasRoom && approved });
    out.push({ to: "/signals", label: "Сигнали", show: !!user && !isAdmin && hasRoom && approved });

    // manager
    out.push({ to: "/reports", label: "Справки", show: !!user && !isAdmin && hasRoom && approved && isManager });
    out.push({ to: "/residents", label: "Живущи", show: !!user && !isAdmin && hasRoom && approved && isManager });

    // admin
    out.push({ to: "/admin", label: "Админ", show: !!user && isAdmin });
    out.push({ to: "/admin/rooms", label: "Входове", show: !!user && isAdmin });

    return out.filter((x) => x.show);
  }, [user, hasRoom, approved, isManager, isAdmin, pendingRoomApproval]);

  const primary = links.slice(0, 5);
  const secondary = links.slice(5);

  return (
    <header className="app-navbar sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3" onClick={closeAll}>
          <img
            src="/Logo.png"
            alt="Online Domoupravitel logo"
            className="h-10 w-10 rounded-2xl object-contain border border-slate-200 bg-white p-1 shadow-sm"
          />
          <div className="leading-tight min-w-0">
            <div className="font-semibold text-slate-900">Онлайн Домоуправител</div>
            <div className="text-xs text-slate-500">
              {user ? `${user.name} • ${roleLabel(user.role, user)}` : "Вход • Регистрация"}
            </div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          <Item to="/" onClick={closeAll}>
            Начало
          </Item>

          {primary.map((l) => (
            <Item key={l.to} to={l.to} onClick={closeAll}>
              {l.label}
            </Item>
          ))}

          {secondary.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setMoreOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                className="px-3 py-2 rounded-2xl text-sm font-semibold border border-transparent text-slate-700 hover:text-slate-900 hover:bg-white/80 hover:border-emerald-200/90 transition"
              >
                Още <span className="text-slate-500">▾</span>
              </button>

              {moreOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-[rgba(11,69,50,0.2)] bg-[rgba(247,255,241,0.96)] shadow-[0_14px_28px_rgba(7,49,74,0.14)] p-2 backdrop-blur">
                  <div className="text-[11px] font-semibold text-slate-500 px-2 py-1">
                    Още секции
                  </div>
                  {secondary.map((l) => (
                    <Item key={l.to} to={l.to} onClick={closeAll}>
                      {l.label}
                    </Item>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden rounded-2xl px-3 py-2 text-sm font-semibold border border-[rgba(11,69,50,0.28)] text-[#0f3f35] bg-[rgba(252,255,248,0.78)] hover:bg-white/95 transition shadow-sm"
            aria-label="Меню"
            aria-expanded={mobileOpen}
          >
            ☰
          </button>

          {!user ? (
            <>
              <Link
                to="/login"
                className="hidden md:inline rounded-2xl px-4 py-2 text-sm font-semibold border border-[rgba(11,69,50,0.28)] text-[#0f3f35] bg-[rgba(252,255,248,0.78)] hover:bg-white/95 transition shadow-sm"
              >
                Вход
              </Link>
              <Link
                to="/register"
                className="hidden md:inline rounded-2xl px-4 py-2 text-sm font-semibold text-[#f4ffe8] border border-[rgba(7,49,74,0.4)] bg-[linear-gradient(135deg,#0a4a79_0%,#0f6c5b_55%,#5b9d27_100%)] shadow-[0_10px_24px_rgba(7,49,74,0.24)] transition"
              >
                Регистрация
              </Link>
            </>
          ) : (
            <>
              <GhostBtn
                onClick={() => {
                  closeAll();
                  navigateWithTransition(navigate, "/");
                }}
              >
                Начало
              </GhostBtn>
              <button
                onClick={() => {
                  logout();
                  closeAll();
                  navigateWithTransition(navigate, "/");
                }}
                className="rounded-2xl px-4 py-2 text-sm font-semibold text-[#f4ffe8] border border-[rgba(7,49,74,0.4)] bg-[linear-gradient(135deg,#0a4a79_0%,#0f6c5b_55%,#5b9d27_100%)] shadow-[0_10px_24px_rgba(7,49,74,0.24)] transition"
              >
                Изход
              </button>
            </>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className="app-navbar-mobile lg:hidden">
          <div className="max-w-6xl mx-auto px-4 py-3 space-y-1">
            <div className="flex items-center justify-between gap-2 pb-2">
              <div className="text-xs text-slate-500">
                {user ? "Навигация" : "Меню"}
              </div>
              <button
                onClick={closeAll}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900"
              >
                Затвори
              </button>
            </div>

            <Item to="/" onClick={closeAll}>
              Начало
            </Item>

            {links.map((l) => (
              <Item key={l.to} to={l.to} onClick={closeAll}>
                {l.label}
              </Item>
            ))}

            {!user && (
              <div className="pt-2 grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={closeAll}
                  className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold border border-[rgba(11,69,50,0.28)] text-[#0f3f35] bg-[rgba(252,255,248,0.78)] hover:bg-white/95 transition shadow-sm"
                >
                  Вход
                </Link>
                <Link
                  to="/register"
                  onClick={closeAll}
                  className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold text-[#f4ffe8] border border-[rgba(7,49,74,0.4)] bg-[linear-gradient(135deg,#0a4a79_0%,#0f6c5b_55%,#5b9d27_100%)] shadow-[0_10px_24px_rgba(7,49,74,0.24)] transition"
                >
                  Регистрация
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
