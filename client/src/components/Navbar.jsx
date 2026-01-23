import { Link, NavLink, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "../store/auth";

function Item({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `block px-3 py-2 rounded-2xl text-sm font-semibold transition ${
          isActive
            ? "bg-slate-900 text-white shadow-sm"
            : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
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
      className="rounded-2xl px-4 py-2 text-sm font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 transition"
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

  const closeAll = () => {
    setMobileOpen(false);
    setMoreOpen(false);
  };

  const links = useMemo(() => {
    const out = [];

    // ✅ always when logged in
    out.push({ to: "/room", label: "Стая", show: !!user });
    out.push({ to: "/dashboard", label: "Табло", show: !!user }); // ✅ NOW ALWAYS
    out.push({ to: "/account", label: "Акаунт", show: !!user });

    // approved sections (still only when hasRoom+approved)
    out.push({ to: "/announcements", label: "Обяви", show: !!user && hasRoom && approved });
    out.push({ to: "/payments", label: "Плащания", show: !!user && hasRoom && approved });
    out.push({ to: "/signals", label: "Сигнали", show: !!user && hasRoom && approved });

    // manager
    out.push({ to: "/reports", label: "Справки", show: !!user && hasRoom && approved && isManager });
    out.push({ to: "/residents", label: "Живущи", show: !!user && hasRoom && approved && isManager });

    // admin
    out.push({ to: "/admin", label: "Admin", show: !!user && isAdmin });
    out.push({ to: "/admin/rooms", label: "Rooms", show: !!user && isAdmin });

    return out.filter((x) => x.show);
  }, [user, hasRoom, approved, isManager, isAdmin]);

  const primary = links.slice(0, 5);
  const secondary = links.slice(5);

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3" onClick={closeAll}>
          <div className="h-10 w-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-lg">ОД</span>
          </div>
          <div className="leading-tight min-w-0">
            <div className="font-semibold text-slate-900">Онлайн Домоуправител</div>
            <div className="text-xs text-slate-500">
              {user ? `${user.name} • ${user.role}` : "Вход • Регистрация"}
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
                className="px-3 py-2 rounded-2xl text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition"
              >
                Още <span className="text-slate-500">▾</span>
              </button>

              {moreOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-200 bg-white shadow-sm p-2">
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
            className="lg:hidden rounded-2xl px-3 py-2 text-sm font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 transition"
            aria-label="Меню"
            aria-expanded={mobileOpen}
          >
            ☰
          </button>

          {!user ? (
            <>
              <Link
                to="/login"
                className="hidden md:inline rounded-2xl px-4 py-2 text-sm font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 transition"
              >
                Вход
              </Link>
              <Link
                to="/register"
                className="hidden md:inline rounded-2xl px-4 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
              >
                Регистрация
              </Link>
            </>
          ) : (
            <>
              <GhostBtn
                onClick={() => {
                  closeAll();
                  navigate("/");
                }}
              >
                Начало
              </GhostBtn>
              <button
                onClick={() => {
                  logout();
                  closeAll();
                  navigate("/");
                }}
                className="rounded-2xl px-4 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
              >
                Изход
              </button>
            </>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white">
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
                  className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 transition"
                >
                  Вход
                </Link>
                <Link
                  to="/register"
                  onClick={closeAll}
                  className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
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
