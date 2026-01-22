import { Link, NavLink, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "../store/auth";

function Item({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `block px-3 py-2 rounded-xl text-sm font-semibold transition ${
          isActive ? "bg-sky-600 text-white" : "text-slate-700 hover:bg-sky-50"
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
      className="rounded-2xl px-4 py-2 text-sm font-semibold border border-sky-200 text-sky-700 hover:bg-sky-50"
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
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-sky-100">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2" onClick={closeAll}>
          <div className="h-10 w-10 rounded-2xl bg-sky-600 flex items-center justify-center shadow-soft">
            <span className="text-white font-black text-lg">ОД</span>
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-slate-900">Онлайн Домоуправител</div>
            <div className="text-xs text-slate-500">
              {user ? `${user.name} • ${user.role}` : "Вход • Регистрация"}
            </div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          <Item to="/" onClick={closeAll}>Начало</Item>

          {primary.map((l) => (
            <Item key={l.to} to={l.to} onClick={closeAll}>
              {l.label}
            </Item>
          ))}

          {secondary.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setMoreOpen((v) => !v)}
                className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-sky-50"
              >
                Още ▾
              </button>

              {moreOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-200 bg-white shadow-soft p-2">
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
            className="lg:hidden rounded-2xl px-3 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50"
          >
            ☰
          </button>

          {!user ? (
            <>
              <Link to="/login" className="hidden md:inline rounded-2xl px-4 py-2 text-sm font-semibold border border-sky-200 text-sky-700 hover:bg-sky-50">
                Вход
              </Link>
              <Link to="/register" className="hidden md:inline rounded-2xl px-4 py-2 text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 shadow-soft">
                Регистрация
              </Link>
            </>
          ) : (
            <>
              <GhostBtn onClick={() => { closeAll(); navigate("/"); }}>Начало</GhostBtn>
              <button
                onClick={() => { logout(); closeAll(); navigate("/"); }}
                className="rounded-2xl px-4 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800"
              >
                Изход
              </button>
            </>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-sky-100 bg-white">
          <div className="max-w-6xl mx-auto px-4 py-3 space-y-1">
            <Item to="/" onClick={closeAll}>Начало</Item>
            {links.map((l) => (
              <Item key={l.to} to={l.to} onClick={closeAll}>
                {l.label}
              </Item>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
