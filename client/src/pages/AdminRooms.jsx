import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../store/auth";
import { PageHeader, HelpCard, ErrorBox, SuccessBox } from "../components/PageBits";

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("bg-BG");
  } catch {
    return "—";
  }
}

function fmtDateTime(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("bg-BG");
  } catch {
    return "—";
  }
}

function Pill({ children, tone = "gray" }) {
  const map = {
    gray: "bg-slate-100 text-slate-700",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-700",
    red: "bg-red-100 text-red-700",
    sky: "bg-sky-100 text-sky-700",
  };
  return <span className={`inline-flex text-xs px-2 py-1 rounded-full ${map[tone] || map.gray}`}>{children}</span>;
}

export default function AdminRooms() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [q, setQ] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // all | true | false
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [editId, setEditId] = useState(null);
  const [apartmentsCount, setApartmentsCount] = useState("");
  const [trialEndsAt, setTrialEndsAt] = useState("");
  const [subscriptionExpires, setSubscriptionExpires] = useState("");

  // transfer manager UI
  const [newManagerEmail, setNewManagerEmail] = useState("");
  const [transferBusy, setTransferBusy] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      const params = {};
      if (q.trim()) params.q = q.trim();
      if (activeFilter !== "all") params.active = activeFilter;

      const res = await api.get("/api/admin/rooms", { params });
      setRooms(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при зареждане");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = (r) => {
    setMsg("");
    setErr("");
    setEditId(r._id);
    setApartmentsCount(r.apartmentsCount ?? "");
    setTrialEndsAt(r.subscription?.trialEndsAt ? new Date(r.subscription.trialEndsAt).toISOString().slice(0, 10) : "");
    setSubscriptionExpires(
      r.subscription?.subscriptionExpires ? new Date(r.subscription.subscriptionExpires).toISOString().slice(0, 10) : ""
    );

    setNewManagerEmail("");
    setTransferBusy(false);
  };

  const closeEdit = () => {
    setEditId(null);
    setApartmentsCount("");
    setTrialEndsAt("");
    setSubscriptionExpires("");
    setNewManagerEmail("");
    setTransferBusy(false);
  };

  const save = async () => {
    try {
      setErr("");
      setMsg("");

      if (!editId) return;

      const body = {
        apartmentsCount: apartmentsCount === "" ? undefined : Number(apartmentsCount),
        trialEndsAt: trialEndsAt === "" ? null : trialEndsAt,
        subscriptionExpires: subscriptionExpires === "" ? null : subscriptionExpires,
      };

      await api.put(`/api/admin/rooms/${editId}/settings`, body);

      setMsg("Запазено.");
      closeEdit();
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при запазване");
    }
  };

  // transfer manager
  const transferManager = async () => {
    try {
      setErr("");
      setMsg("");

      if (!editId) return;
      const email = newManagerEmail.trim().toLowerCase();
      if (!email) return setErr("Въведи имейл на новия домоуправител.");

      setTransferBusy(true);

      const res = await api.post(`/api/admin/rooms/${editId}/transfer-manager`, { email });

      setMsg(res.data?.message || "Домоуправителят е сменен.");
      closeEdit();
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при смяна на домоуправител");
    } finally {
      setTransferBusy(false);
    }
  };

  const view = useMemo(() => rooms, [rooms]);

  if (!user) return null;
  if (!isAdmin) return <div className="p-6">403</div>;

  return (
    <div className="min-h-screen bg-sky-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <PageHeader
          title="Admin — Входове (Rooms)"
          subtitle={
            <>
              Тук управляваш всички входове в системата: брой апартаменти, trial и платен период.
              <br />
              Налична е и смяна на домоуправител (transfer ownership).
            </>
          }
          right={
            <button
              onClick={load}
              className="rounded-2xl px-4 py-2 text-sm font-semibold border border-sky-200 text-sky-700 hover:bg-sky-50"
            >
              Обнови
            </button>
          }
        />

        <ErrorBox>{err}</ErrorBox>
        <SuccessBox>{msg}</SuccessBox>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* MAIN */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-soft">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Търсене</label>
                  <input
                    className="w-full border rounded-2xl px-4 py-3"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="град / блок / вход / код"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Филтър активност</label>
                  <select
                    className="w-full border rounded-2xl px-4 py-3"
                    value={activeFilter}
                    onChange={(e) => setActiveFilter(e.target.value)}
                  >
                    <option value="all">Всички</option>
                    <option value="true">Само активни</option>
                    <option value="false">Само неактивни</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={load}
                    className="w-full rounded-2xl px-4 py-3 text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700"
                  >
                    Търси
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-soft">
              <div className="font-black text-slate-900">Списък входове</div>
              <div className="text-sm text-slate-600 mt-2">
                Натисни “Настройки”, за да промениш apartmentsCount или да удължиш trial/платен период.
              </div>

              {loading ? (
                <div className="text-sm text-slate-500 mt-4">Зареждане...</div>
              ) : view.length === 0 ? (
                <div className="text-sm text-slate-500 mt-4">Няма входове.</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {view.map((r) => {
                    const active = !!r.subscription?.active;
                    return (
                      <div key={r._id} className="rounded-3xl border border-slate-200 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-black text-slate-900">
                              {r.city} • Блок {r.building} • Вход {r.entrance}
                            </div>

                            <div className="text-sm text-slate-600 mt-1">
                              Код: <b className="text-sky-700">{r.code}</b>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <Pill tone={active ? "green" : "red"}>{active ? "активен" : "неактивен"}</Pill>
                              <Pill tone="gray">апартаменти: {r.apartmentsCount ?? "—"}</Pill>
                              <Pill tone="gray">members: {r.membersCount}</Pill>
                            </div>

                            <div className="text-xs text-slate-500 mt-3">
                              Trial до: <b>{fmtDate(r.subscription?.trialEndsAt)}</b> • Платено до:{" "}
                              <b>{fmtDate(r.subscription?.subscriptionExpires)}</b>
                            </div>

                            <div className="text-xs text-slate-500 mt-2">
                              Създадена: {fmtDateTime(r.createdAt)} • Домоуправител:{" "}
                              {r.createdBy?.name ? `${r.createdBy.name} (${r.createdBy.email})` : "—"}
                              {r.createdBy?.phone ? ` • ${r.createdBy.phone}` : ""}
                            </div>
                          </div>

                          <button
                            onClick={() => openEdit(r)}
                            className="shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold border border-sky-200 text-sky-700 hover:bg-sky-50"
                          >
                            Настройки
                          </button>
                        </div>

                        {editId === r._id && (
                          <div className="mt-4 rounded-3xl border border-sky-100 bg-sky-50 p-4">
                            <div className="font-semibold text-slate-900">Редакция</div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Апартаменти (1-500)</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="500"
                                  className="w-full border rounded-2xl px-4 py-3"
                                  value={apartmentsCount}
                                  onChange={(e) => setApartmentsCount(e.target.value)}
                                  placeholder="пример: 24"
                                />
                              </div>

                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Trial ends (YYYY-MM-DD)</label>
                                <input
                                  type="date"
                                  className="w-full border rounded-2xl px-4 py-3"
                                  value={trialEndsAt}
                                  onChange={(e) => setTrialEndsAt(e.target.value)}
                                />
                              </div>

                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Paid expires (YYYY-MM-DD)</label>
                                <input
                                  type="date"
                                  className="w-full border rounded-2xl px-4 py-3"
                                  value={subscriptionExpires}
                                  onChange={(e) => setSubscriptionExpires(e.target.value)}
                                />
                              </div>
                            </div>

                            {/* transfer manager */}
                            <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4">
                              <div className="font-semibold text-slate-900">Смяна на домоуправител</div>
                              <div className="text-xs text-slate-600 mt-1">
                                Въведи имейла на потребителя, който ще стане нов домоуправител за този вход.
                                Старият домоуправител става resident.
                              </div>

                              <div className="mt-3 flex flex-col md:flex-row gap-2">
                                <input
                                  className="flex-1 border rounded-2xl px-4 py-3"
                                  placeholder="email на новия домоуправител"
                                  value={newManagerEmail}
                                  onChange={(e) => setNewManagerEmail(e.target.value)}
                                />
                                <button
                                  onClick={transferManager}
                                  disabled={transferBusy}
                                  className="rounded-2xl px-4 py-3 text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
                                >
                                  {transferBusy ? "Обработка..." : "Смени домоуправител"}
                                </button>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                onClick={save}
                                className="rounded-2xl px-4 py-2 text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700"
                              >
                                Запази
                              </button>
                              <button
                                onClick={closeEdit}
                                className="rounded-2xl px-4 py-2 text-sm font-semibold border border-slate-200 hover:bg-white"
                              >
                                Отказ
                              </button>
                            </div>

                            <div className="text-xs text-slate-600 mt-3">
                              Ако искаш да активираш входа: сложи subscriptionExpires в бъдещето, или удължи trialEndsAt.
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ASIDE */}
          <div className="space-y-4">
            <HelpCard title="Какво контролира активността">
              <div className="text-sm text-slate-700 mt-2">
                Входът е активен ако: <b>trialEndsAt</b> е в бъдещето или <b>subscriptionExpires</b> е в бъдещето.
                <br />
                Това се проверява от requireRoomActive middleware-а.
              </div>
            </HelpCard>

            <HelpCard title="Смяна на домоуправител">
              <div className="text-sm text-slate-700 mt-2">
                Прехвърля ownership-а на стаята към друг потребител (по имейл).
                Старият домоуправител става resident и остава член на стаята.
              </div>
            </HelpCard>
          </div>
        </div>
      </div>
    </div>
  );
}
