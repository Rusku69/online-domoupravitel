import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../store/auth";
import { PageHeader, HelpCard, ErrorBox, SuccessBox } from "../components/PageBits";
import SiteFooter from "../components/SiteFooter";
import {
  apartmentSort,
  formatApartmentList,
  getMemberApartments,
  getUserApartments,
} from "../lib/apartments";

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
    gray: "bg-slate-100 text-slate-700 border-slate-200",
    green: "bg-emerald-50 text-emerald-900 border-emerald-200",
    yellow: "bg-amber-50 text-amber-900 border-amber-200",
    red: "bg-rose-50 text-rose-900 border-rose-200",
    sky: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return (
    <span className={`inline-flex text-xs px-2.5 py-1 rounded-full border ${map[tone] || map.gray}`}>
      {children}
    </span>
  );
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
  const [initialSettings, setInitialSettings] = useState({
    apartmentsCount: "",
    trialEndsAt: "",
    subscriptionExpires: "",
  });

  // transfer manager UI
  const [newManagerEmail, setNewManagerEmail] = useState("");
  const [transferBusy, setTransferBusy] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [roomMembers, setRoomMembers] = useState([]);
  const [membersSummary, setMembersSummary] = useState(null);
  const [adminMembersEndpointAvailable, setAdminMembersEndpointAvailable] = useState(true);

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

  const sortMembers = (members) => {
    return [...members].sort((a, b) => {
      if (a.isRoomManager && !b.isRoomManager) return -1;
      if (!a.isRoomManager && b.isRoomManager) return 1;

      const aFirst = getMemberApartments(a)[0] || "";
      const bFirst = getMemberApartments(b)[0] || "";
      return apartmentSort(aFirst, bFirst);
    });
  };

  const buildMembersSummary = (members) => {
    return {
      total: members.length,
      managerCount: members.filter((x) => x.isRoomManager).length,
      residentCount: members.filter((x) => !x.isRoomManager).length,
      approvedCount: members.filter((x) => x.memberStatus === "approved").length,
      pendingCount: members.filter((x) => x.memberStatus === "pending").length,
    };
  };

  const applyMembersPayload = (payload) => {
    const normalized = (Array.isArray(payload?.members) ? payload.members : []).map((m) => ({
      _id: m?._id || m?.user?._id || m?.user || null,
      name: m?.name || m?.nameSnapshot || m?.user?.name || "—",
      email: m?.email || m?.user?.email || "—",
      phone: m?.phone || m?.phoneSnapshot || m?.user?.phone || "",
      apartment: m?.apartment || m?.user?.apartment || "",
      apartments: getMemberApartments(m).length ? getMemberApartments(m) : getUserApartments(m?.user),
      apartmentLabel:
        m?.apartmentLabel ||
        formatApartmentList(getMemberApartments(m).length ? getMemberApartments(m) : getUserApartments(m?.user)),
      role: m?.role || m?.user?.role || (m?.isRoomManager ? "manager" : "resident"),
      memberStatus: m?.memberStatus || m?.status || m?.user?.memberStatus || "pending",
      isRoomManager: !!m?.isRoomManager,
    }));

    const sorted = sortMembers(normalized);
    const summary =
      payload?.summary && typeof payload.summary === "object"
        ? {
            total: Number(payload.summary.total ?? sorted.length),
            managerCount: Number(payload.summary.managerCount ?? sorted.filter((x) => x.isRoomManager).length),
            residentCount: Number(payload.summary.residentCount ?? sorted.filter((x) => !x.isRoomManager).length),
            approvedCount: Number(payload.summary.approvedCount ?? sorted.filter((x) => x.memberStatus === "approved").length),
            pendingCount: Number(payload.summary.pendingCount ?? sorted.filter((x) => x.memberStatus === "pending").length),
          }
        : buildMembersSummary(sorted);

    setRoomMembers(sorted);
    setMembersSummary(summary);
    setMembersLoaded(true);
  };

  const loadRoomMembers = async (roomId) => {
    try {
      setMembersLoading(true);
      setMembersLoaded(false);

      if (adminMembersEndpointAvailable) {
        try {
          const res = await api.get(`/api/admin/rooms/${roomId}/members`);
          if (Array.isArray(res?.data?.members)) {
            applyMembersPayload(res.data);
            return;
          }
        } catch (e) {
          if (e?.response?.status === 404) {
            setAdminMembersEndpointAvailable(false);
          } else {
            throw e;
          }
        }
      }

      // Fallback за по-стар backend без admin members endpoint.
      const res = await api.get(`/api/rooms/${roomId}`);
      const roomData = res.data || {};
      const createdBy = roomData?.createdBy || {};
      const managerId = String(createdBy?._id || roomData?.createdBy || "");

      const membersRaw = Array.isArray(roomData?.members) ? roomData.members : [];
      const members = membersRaw.map((m) => {
        const memberUser = m?.user && typeof m.user === "object" ? m.user : null;
        const memberUserId = memberUser?._id ? String(memberUser._id) : String(m?.user || "");
        const isRoomManager = !!(managerId && memberUserId === managerId);

        return {
          _id: memberUserId || null,
          name: m?.nameSnapshot || memberUser?.name || (isRoomManager ? createdBy?.name || "—" : "—"),
          email: memberUser?.email || (isRoomManager ? createdBy?.email || "—" : "—"),
          phone: m?.phoneSnapshot || memberUser?.phone || (isRoomManager ? createdBy?.phone || "" : ""),
          apartment: m?.apartment || memberUser?.apartment || "",
          apartments: getMemberApartments(m).length ? getMemberApartments(m) : getUserApartments(memberUser),
          apartmentLabel: formatApartmentList(
            getMemberApartments(m).length ? getMemberApartments(m) : getUserApartments(memberUser)
          ),
          role: memberUser?.role || (isRoomManager ? "manager" : "resident"),
          memberStatus: m?.status || memberUser?.memberStatus || "pending",
          isRoomManager,
        };
      });

      if (managerId && !members.some((x) => String(x._id || "") === managerId)) {
        const managerApartments = getUserApartments(createdBy);
        members.unshift({
          _id: managerId,
          name: createdBy?.name || "—",
          email: createdBy?.email || "—",
          phone: createdBy?.phone || "",
          apartment: createdBy?.apartment || "",
          apartments: managerApartments,
          apartmentLabel: formatApartmentList(managerApartments),
          role: "manager",
          memberStatus: "approved",
          isRoomManager: true,
        });
      }

      const sorted = sortMembers(members);
      setRoomMembers(sorted);
      setMembersSummary(buildMembersSummary(sorted));
      setMembersLoaded(true);
    } catch (e) {
      setRoomMembers([]);
      setMembersSummary(null);
      setErr(e?.response?.data?.message || "Грешка при зареждане на членове");
      setMembersLoaded(true);
    } finally {
      setMembersLoading(false);
    }
  };

  const openEdit = async (r) => {
    setMsg("");
    setErr("");
    setEditId(r._id);
    const nextInitialSettings = {
      apartmentsCount: r.apartmentsCount === null || r.apartmentsCount === undefined ? "" : String(r.apartmentsCount),
      trialEndsAt: r.subscription?.trialEndsAt ? new Date(r.subscription.trialEndsAt).toISOString().slice(0, 10) : "",
      subscriptionExpires: r.subscription?.subscriptionExpires
        ? new Date(r.subscription.subscriptionExpires).toISOString().slice(0, 10)
        : "",
    };
    setApartmentsCount(nextInitialSettings.apartmentsCount);
    setTrialEndsAt(nextInitialSettings.trialEndsAt);
    setSubscriptionExpires(nextInitialSettings.subscriptionExpires);
    setInitialSettings(nextInitialSettings);

    setNewManagerEmail("");
    setTransferBusy(false);
    setMembersLoaded(false);
    setRoomMembers([]);
    setMembersSummary(null);
    await loadRoomMembers(r._id);
  };

  const closeEdit = () => {
    setEditId(null);
    setApartmentsCount("");
    setTrialEndsAt("");
    setSubscriptionExpires("");
    setInitialSettings({ apartmentsCount: "", trialEndsAt: "", subscriptionExpires: "" });
    setNewManagerEmail("");
    setTransferBusy(false);
    setMembersLoading(false);
    setMembersLoaded(false);
    setRoomMembers([]);
    setMembersSummary(null);
  };

  const save = async () => {
    try {
      setErr("");
      setMsg("");

      if (!editId || !hasSettingsChanges) return;

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

  const hasSettingsChanges = useMemo(() => {
    if (!editId) return false;

    const normalizeApt = (v) => {
      if (v === "" || v === null || v === undefined) return "";
      const n = Number(v);
      return Number.isFinite(n) ? String(n) : String(v).trim();
    };

    return (
      normalizeApt(apartmentsCount) !== normalizeApt(initialSettings.apartmentsCount) ||
      String(trialEndsAt || "") !== String(initialSettings.trialEndsAt || "") ||
      String(subscriptionExpires || "") !== String(initialSettings.subscriptionExpires || "")
    );
  }, [editId, apartmentsCount, trialEndsAt, subscriptionExpires, initialSettings]);

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <div className="flex-1 p-6">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="font-black text-slate-900">403</div>
              <div className="text-sm text-slate-600 mt-2">
                Нямаш достъп до тази секция. Само администратор може да управлява входовете.
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                Ако си домоуправител, използвай модулите за твоя вход и профила си.
              </div>
            </div>
          </div>
        </div>
        
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <PageHeader
            title="Админ — Входове (Rooms)"
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
                className="rounded-2xl px-4 py-2 text-sm font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 transition"
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
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Търсене</label>
                    <input
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="град / блок / вход / код"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Филтър активност</label>
                    <select
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
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
                      className="w-full rounded-2xl px-4 py-3.5 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
                    >
                      Търси
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Pill tone="gray">Общо: {rooms.length}</Pill>
                  <Pill tone="sky">Показани: {view.length}</Pill>
                  <Pill tone={loading ? "yellow" : "green"}>{loading ? "Статус: зареждане" : "Статус: готово"}</Pill>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  Съвет: можеш да филтрираш по активни/неактивни входове и да търсиш по код, град, блок или вход.
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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
                      const visibleMembers = roomMembers;
                      const totalMembersCount = membersSummary?.total ?? visibleMembers.length;
                      const managerMembersCount = membersSummary?.managerCount ?? 0;
                      const residentMembersCount = membersSummary?.residentCount ?? 0;
                      const approvedMembersCount = membersSummary?.approvedCount ?? 0;
                      const pendingMembersCount = membersSummary?.pendingCount ?? 0;

                      return (
                        <div key={r._id} className="rounded-3xl border border-slate-200 p-5 bg-white shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-black text-slate-900">
                                {r.city} • Блок {r.building} • Вход {r.entrance}
                              </div>

                              <div className="text-sm text-slate-600 mt-1">
                                Код: <b className="text-slate-900">{r.code}</b>
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
                              onClick={() => (editId === r._id ? closeEdit() : openEdit(r))}
                              className="shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 transition"
                            >
                              {editId === r._id ? "Затвори" : "Настройки"}
                            </button>
                          </div>

                          {editId === r._id && (
                            <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                              <div className="font-semibold text-slate-900">Редакция</div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Апартаменти (1-500)
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="500"
                                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                                    value={apartmentsCount}
                                    onChange={(e) => setApartmentsCount(e.target.value)}
                                    placeholder="пример: 24"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Trial ends (YYYY-MM-DD)
                                  </label>
                                  <input
                                    type="date"
                                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                                    value={trialEndsAt}
                                    onChange={(e) => setTrialEndsAt(e.target.value)}
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Paid expires (YYYY-MM-DD)
                                  </label>
                                  <input
                                    type="date"
                                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
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
                                  Старият домоуправител става Живущ.
                                </div>

                                <div className="mt-3 flex flex-col md:flex-row gap-2">
                                  <input
                                    className="flex-1 border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                                    placeholder="email на новия домоуправител"
                                    value={newManagerEmail}
                                    onChange={(e) => setNewManagerEmail(e.target.value)}
                                  />
                                  <button
                                    onClick={transferManager}
                                    disabled={transferBusy}
                                    className="rounded-2xl px-4 py-3.5 text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 transition shadow-sm"
                                  >
                                    {transferBusy ? "Обработка..." : "Смени домоуправител"}
                                  </button>
                                </div>
                              </div>

                              <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4">
                                <div className="font-semibold text-slate-900">Хора в тази стая</div>
                                <div className="text-xs text-slate-600 mt-1">
                                  Виждаш домоуправителя и всички живущи с роля и статус.
                                </div>

                                {membersLoading ? (
                                  <div className="mt-3 text-sm text-slate-500">Зареждане на членове...</div>
                                ) : !membersLoaded ? (
                                  <div className="mt-3 text-sm text-slate-500">Зареждане...</div>
                                ) : visibleMembers.length === 0 ? (
                                  <div className="mt-3 text-sm text-slate-500">Няма записани хора в тази стая.</div>
                                ) : (
                                  <>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <Pill tone="gray">Общо: {totalMembersCount}</Pill>
                                      <Pill tone="sky">Домоуправител: {managerMembersCount}</Pill>
                                      <Pill tone="gray">Живущи: {residentMembersCount}</Pill>
                                      <Pill tone="green">Approved: {approvedMembersCount}</Pill>
                                      <Pill tone="yellow">Pending: {pendingMembersCount}</Pill>
                                    </div>

                                    <div className="mt-3 space-y-2">
                                      {visibleMembers.map((m) => (
                                        <div
                                          key={`${r._id}-${m._id || m.email}-${m.apartmentLabel || "na"}`}
                                          className="rounded-2xl border border-slate-200 px-3 py-2 bg-slate-50"
                                        >
                                          <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="text-sm text-slate-800">
                                              <b className="text-slate-900">{m.name || "—"}</b>
                                              {m.email ? ` • ${m.email}` : ""}
                                              {m.apartmentLabel ? ` • ап. ${m.apartmentLabel}` : ""}
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                              <Pill tone={m.isRoomManager ? "sky" : "gray"}>
                                                {m.isRoomManager ? "домоуправител" : "живущ"}
                                              </Pill>
                                              <Pill tone={m.memberStatus === "approved" ? "green" : "yellow"}>
                                                {m.memberStatus || "pending"}
                                              </Pill>
                                            </div>
                                          </div>
                                          {m.phone && <div className="mt-1 text-xs text-slate-500">{m.phone}</div>}
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>

                              {hasSettingsChanges && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <button
                                    onClick={save}
                                    className="rounded-2xl px-4 py-2.5 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
                                  >
                                    Запази
                                  </button>
                                  <button
                                    onClick={closeEdit}
                                    className="rounded-2xl px-4 py-2.5 text-sm font-semibold border border-slate-300 text-slate-900 hover:bg-white transition"
                                  >
                                    Отказ
                                  </button>
                                </div>
                              )}

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
                  Прехвърля ownership-а на стаята към друг потребител (по имейл). Старият домоуправител става Живущ и
                  остава член на стаята.
                </div>
              </HelpCard>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Бележка</div>
                <div className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Този модул е административен. Използва се за поддръжка на системата, корекции по входове и контрол на активността.
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  Добра практика: при transfer ownership провери, че новият имейл принадлежи на реален потребител от същия вход.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
}
