import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../store/auth";
import SubscriptionBanner from "../components/SubscriptionBanner";
import { Link } from "react-router-dom";
import { roleLabel } from "../lib/roles";
import { formatApartmentList, getUserApartments, normalizeApartmentList } from "../lib/apartments";

const ROOM_VERIFY_ENFORCE_FROM = import.meta.env.VITE_ROOM_EMAIL_VERIFY_ENFORCE_FROM || "2026-02-12T00:00:00.000Z";

function parseSafeDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function shouldRequireRoomEmailVerify(user) {
  if (!user) return false;
  if (user.mustVerifyEmailForRoomActions === true) return true;
  if (user.mustVerifyEmailForRoomActions === false) return false;

  const enforceFrom = parseSafeDate(ROOM_VERIFY_ENFORCE_FROM);
  const createdAt = parseSafeDate(user.createdAt);

  if (!enforceFrom || !createdAt) return false;
  return createdAt >= enforceFrom;
}

function Badge({ children, tone = "gray" }) {
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

export default function Room() {
  const { user, fetchUser } = useAuth();

  const [room, setRoom] = useState(null);
  const [pending, setPending] = useState([]);
  const [codeInput, setCodeInput] = useState("");
  const [selectedApartments, setSelectedApartments] = useState([]);
  const [roomLookup, setRoomLookup] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [apartmentsCountInput, setApartmentsCountInput] = useState("");
  const [adminFinanceHolderInput, setAdminFinanceHolderInput] = useState("");
  const [adminFinanceIbanInput, setAdminFinanceIbanInput] = useState("");
  const [adminFinanceSaving, setAdminFinanceSaving] = useState(false);

  // manager request form
  const [reqCity, setReqCity] = useState("");
  const [reqBuilding, setReqBuilding] = useState("");
  const [reqEntrance, setReqEntrance] = useState("");
  const [reqApartmentInput, setReqApartmentInput] = useState("");
  const [reqSelectedApartments, setReqSelectedApartments] = useState([]);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const isResident = user?.role === "resident";

  const isApproved = user?.memberStatus === "approved";
  const hasRoom = !!user?.roomId;
  const isWaitingRoomApproval = hasRoom && !isApproved && !isManager && !isAdmin;
  const requiresManagerEmailVerify =
    isResident && shouldRequireRoomEmailVerify(user) && !user?.emailVerified;

  const safePending = useMemo(() => (pending || []).filter(Boolean), [pending]);
  const userApartmentLabel = useMemo(() => formatApartmentList(getUserApartments(user)), [user]);
  const selectedApartmentLabel = useMemo(() => formatApartmentList(selectedApartments, ""), [selectedApartments]);
  const selectedRequestApartmentLabel = useMemo(
    () => formatApartmentList(reqSelectedApartments, ""),
    [reqSelectedApartments]
  );

  const loadRoomInfo = async () => {
    if (!user) return;
    try {
      setErr("");
      setMsg("");
      setLoading(true);

      if (!user.roomId) {
        setRoom(null);
        setPending([]);
        setRoomLookup(null);
        setSelectedApartments([]);
        return;
      }

      const roomRes = await api.get(`/api/rooms/${user.roomId}`);
      setRoom(roomRes.data || null);

      const ac = roomRes.data?.apartmentsCount;
      if (ac !== null && ac !== undefined && !apartmentsCountInput) {
        setApartmentsCountInput(String(ac));
      }

      const finance = roomRes.data?.finance || {};
      setAdminFinanceHolderInput(String(finance.holderName || ""));
      setAdminFinanceIbanInput(String(finance.iban || ""));

      if (isManager) {
        try {
          const pendingRes = await api.get(`/api/rooms/${user.roomId}/pending`);
          setPending(Array.isArray(pendingRes.data) ? pendingRes.data : []);
        } catch {
          setPending([]);
        }
      } else {
        setPending([]);
      }
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при зареждане на стаята.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadRoomInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.roomId, user?.role, user?.memberStatus]);

  const lookupRoomByCode = async (incomingCode = codeInput) => {
    const code = String(incomingCode || "").trim();
    if (!code || isAdmin) {
      setRoomLookup(null);
      return null;
    }

    try {
      setErr("");
      setLookupLoading(true);
      const res = await api.get("/api/rooms/lookup", { params: { code } });
      const nextLookup = res.data || null;
      setRoomLookup(nextLookup);
      setSelectedApartments((current) =>
        current.filter((apt) => (nextLookup?.availableApartments || []).includes(apt))
      );
      return nextLookup;
    } catch (e) {
      setRoomLookup(null);
      setErr(e?.response?.data?.message || "Грешка при проверка на кода.");
      return null;
    } finally {
      setLookupLoading(false);
    }
  };

  const toggleSelectedApartment = (apartment) => {
    setSelectedApartments((current) =>
      current.includes(apartment) ? current.filter((apt) => apt !== apartment) : [...current, apartment]
    );
  };

  const addRequestedApartments = (value = reqApartmentInput) => {
    const next = normalizeApartmentList(value);
    if (!next.length) return;

    setReqSelectedApartments((current) => normalizeApartmentList([...current, ...next]));
    setReqApartmentInput("");
  };

  const removeRequestedApartment = (apartment) => {
    setReqSelectedApartments((current) => current.filter((apt) => apt !== apartment));
  };

  // изпращане на manager request
  const sendManagerRequest = async (e) => {
    e.preventDefault();
    try {
      setErr("");
      setMsg("");

      if (requiresManagerEmailVerify) {
        return setErr("Потвърди имейла си, за да подаваш заявка за домоуправител.");
      }

      if (!reqCity.trim() || !reqBuilding.trim() || !reqEntrance.trim()) {
        return setErr("Попълни град, блок и вход.");
      }

      const requestedApartments = normalizeApartmentList([
        ...reqSelectedApartments,
        ...normalizeApartmentList(reqApartmentInput),
      ]);
      if (!requestedApartments.length) {
        return setErr("Попълни апартамент (домоуправителят трябва да е живущ).");
      }

      await api.post("/api/rooms/manager-request", {
        city: reqCity.trim(),
        building: reqBuilding.trim(),
        entrance: reqEntrance.trim().toUpperCase(),
        apartments: requestedApartments,
      });

      setMsg("Заявката за домоуправител е изпратена. Изчакай Админ одобрение.");
      setReqApartmentInput("");
      setReqSelectedApartments([]);
      await fetchUser();
      await loadRoomInfo();
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при изпращане на заявка");
    }
  };

  const joinRoom = async (e) => {
    e.preventDefault();
    try {
      setErr("");
      setMsg("");

      if (!codeInput.trim()) return setErr("Въведи код за стая.");
      if (!isAdmin && !selectedApartments.length) return setErr("Избери поне един апартамент.");

      if (!isAdmin && !roomLookup) {
        const lookedUpRoom = await lookupRoomByCode(codeInput.trim());
        if (!lookedUpRoom) return;
      }

      const res = await api.post("/api/rooms/join", {
        code: codeInput.trim(),
        apartments: selectedApartments,
      });

      if (res?.data?.autoApproved) {
        setMsg("Влезе в стаята като Админ.");
      } else {
        setMsg("Заявката е изпратена. Изчакай одобрение от домоуправителя.");
      }
      await fetchUser();
      await loadRoomInfo();
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при присъединяване");
    }
  };

  const leaveRoomAsAdmin = async () => {
    try {
      setErr("");
      setMsg("");

      await api.post("/api/rooms/leave");

      setRoom(null);
      setPending([]);
      setApartmentsCountInput("");
      setAdminFinanceHolderInput("");
      setAdminFinanceIbanInput("");
      setCodeInput("");
      setSelectedApartments([]);
      setRoomLookup(null);

      await fetchUser();
      setMsg("Излезе от стаята. Можеш да влезеш в друга с код.");
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при излизане от стаята");
    }
  };

  const approveResident = async (memberId) => {
    try {
      setErr("");
      setMsg("");
      await api.post("/api/rooms/approve", { memberId });
      setMsg("Одобрено.");
      await loadRoomInfo();
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при одобряване");
    }
  };

  const rejectResident = async (memberId) => {
    try {
      setErr("");
      setMsg("");
      await api.post("/api/rooms/reject", { memberId });
      setMsg("Заявката е отхвърлена.");
      await loadRoomInfo();
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при отхвърляне");
    }
  };

  const resendVerify = async () => {
    try {
      setErr("");
      setMsg("");
      setVerifyLoading(true);

      const res = await api.post("/api/auth/resend-verify-email");
      setMsg(res?.data?.message || "Изпратен е имейл за потвърждение.");
      await fetchUser();
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при изпращане на имейл за потвърждение");
    } finally {
      setVerifyLoading(false);
    }
  };

  const copyCode = async () => {
    const code = room?.code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setMsg("Кодът е копиран.");
    } catch {
      setMsg("Код: " + code);
    }
  };

  const saveApartmentsCount = async () => {
    try {
      setErr("");
      setMsg("");

      if (!room?._id) return setErr("Няма стая.");
      const n = Number(apartmentsCountInput);
      if (!Number.isFinite(n) || n <= 0) return setErr("Въведи валиден брой апартаменти.");

      await api.put(`/api/rooms/${room._id}/apartments-count`, { apartmentsCount: n });

      setMsg("Броят апартаменти е запазен.");
      await loadRoomInfo();
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при запазване");
    }
  };

  const saveAdminPayoutOverride = async () => {
    try {
      setErr("");
      setMsg("");
      setAdminFinanceSaving(true);

      if (!room?._id) return setErr("Няма стая.");
      if (!adminFinanceHolderInput.trim()) return setErr("Въведи получател.");
      if (!adminFinanceIbanInput.trim()) return setErr("Въведи IBAN.");

      await api.patch(`/api/rooms/${room._id}/finance/admin-payout`, {
        holderName: adminFinanceHolderInput.trim(),
        iban: adminFinanceIbanInput.trim(),
      });

      setMsg("IBAN/получател са обновени.");
      await loadRoomInfo();
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при обновяване на IBAN/получател");
    } finally {
      setAdminFinanceSaving(false);
    }
  };

  if (!user) return null;

  const subActive = !!room?.subscription?.active;
  const managerRequestStatus = user?.managerRequestStatus || "none";
  const pendingApartmentLabel = room?.pendingRequest?.apartmentLabel || userApartmentLabel;
  const roomStateLabel = hasRoom ? (isWaitingRoomApproval ? "В изчакване" : "Активна") : "Няма";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Стая (вход)</h1>
                <div className="text-sm text-slate-600 mt-1">
                  {user.city ? `Град: ${user.city} • ` : ""}
                  Блок: <b className="text-slate-900">{user.building || "—"}</b>
                  {user.entrance ? ` • Вход: ${user.entrance}` : ""}
                  {userApartmentLabel && userApartmentLabel !== "—" ? ` • Ап: ${userApartmentLabel}` : ""}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge tone="sky">{roleLabel(user.role, user)}</Badge>
                  <Badge tone={isApproved ? "green" : "yellow"}>членство: {user.memberStatus || "pending"}</Badge>
                  {hasRoom && !isWaitingRoomApproval && (
                    <Badge tone={subActive ? "green" : "red"}>абонамент: {subActive ? "активен" : "неактивен"}</Badge>
                  )}
                  {isResident && (
                    <Badge
                      tone={
                        managerRequestStatus === "approved"
                          ? "green"
                          : managerRequestStatus === "pending"
                          ? "yellow"
                          : "gray"
                      }
                    >
                      домоуправител заявка: {managerRequestStatus}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Стая</div>
                <div className="text-sm font-semibold text-slate-900">{roomStateLabel}</div>
                {isAdmin && hasRoom && (
                  <button
                    onClick={leaveRoomAsAdmin}
                    className="mt-2 rounded-2xl px-3 py-2 text-xs font-semibold border border-rose-300 text-rose-900 hover:bg-rose-50 transition"
                  >
                    Излез от стаята
                  </button>
                )}
              </div>
            </div>

            {loading && <p className="text-sm text-slate-500">Зареждане...</p>}

            {!loading && err && (
              <div className="mb-4 text-sm text-rose-900 bg-rose-50 border border-rose-200 rounded-2xl p-3">{err}</div>
            )}

            {!loading && msg && (
              <div className="mb-4 text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                {msg}
              </div>
            )}

            {!hasRoom && requiresManagerEmailVerify && (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="font-semibold text-amber-900">Потвърди имейла си</div>
                <div className="mt-1 text-sm text-amber-900/90">
                  За този акаунт първо трябва да потвърдиш имейла, ако искаш да подаваш заявка за домоуправител.
                </div>
                <button
                  onClick={resendVerify}
                  disabled={verifyLoading}
                  className="mt-3 rounded-2xl px-4 py-2 text-sm font-semibold border border-amber-300 text-amber-900 hover:bg-amber-100 disabled:opacity-60 transition"
                >
                  {verifyLoading ? "Изпращане..." : "Изпрати имейл за потвърждение"}
                </button>
              </div>
            )}

            {/* Status block */}
            <div id="status" className="rounded-2xl border border-slate-200 p-4 bg-white mb-4 shadow-sm">
              <div className="font-semibold text-slate-900">Статус на достъп</div>
              {isWaitingRoomApproval ? (
                <>
                  <div className="text-sm text-slate-600 mt-2">
                    Заявката ти е изпратена и в момента чака преглед от домоуправителя.
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="green">стая: заявена</Badge>
                    <Badge tone="yellow">статус: в изчакване</Badge>
                    {pendingApartmentLabel && pendingApartmentLabel !== "—" && (
                      <Badge tone="sky">апартаменти: {pendingApartmentLabel}</Badge>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 mt-3">
                    След одобрение автоматично ще получиш достъп до останалите секции на входа.
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm text-slate-600 mt-2">
                    Тук се управлява принадлежността към стая (вход). Стая има свой код, членове и правила за достъп.
                    Достъпът до данни (плащания/обяви/сигнали) е възможен след одобрение.
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone={hasRoom ? "green" : "red"}>стая: {hasRoom ? "активна" : "няма"}</Badge>
                    <Badge tone={isApproved ? "green" : "yellow"}>достъп: {isApproved ? "одобрен" : "чака"}</Badge>
                    {hasRoom && (
                      <Badge tone={subActive ? "green" : "red"}>абонамент: {subActive ? "активен" : "неактивен"}</Badge>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 mt-3">
                    Ако не си одобрен, някои секции могат да са ограничени, за да няма достъп до чужда информация.
                  </div>
                </>
              )}
            </div>

            {/* Subscription banner */}
            {hasRoom && room && !isWaitingRoomApproval && (
              <div id="subscription" className="mb-4">
                <SubscriptionBanner room={room} />
              </div>
            )}

            {isManager && hasRoom && !isWaitingRoomApproval && !subActive && (
              <div className="mt-3" id="subscription">
                <Link
                  to="/subscription"
                  className="inline-flex rounded-2xl px-4 py-2.5 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
                >
                  Поднови абонамент
                </Link>
                <div className="text-xs text-slate-600 mt-2">Подновяването го прави домоуправителят.</div>
              </div>
            )}

            {/* Join / Requests */}
            <div id="join">
              {!hasRoom && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Manager request */}
                  <div className="border border-slate-200 rounded-3xl p-4 bg-white shadow-sm">
                    <h2 className="font-semibold mb-2 text-slate-900">Домоуправител</h2>
                    <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                      Подай заявка към Админ: въведи град/блок/вход и апартаментите си. След одобрение ставаш домоуправител и
                      стаята се създава автоматично.
                    </p>

                    {isResident && managerRequestStatus === "pending" ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        Имаш изпратена заявка. Изчакай Админ.
                      </div>
                    ) : isResident && managerRequestStatus === "rejected" ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                        Заявката е отказана. Можеш да подадеш нова.
                      </div>
                    ) : (
                      <form onSubmit={sendManagerRequest} className="space-y-2">
                        <input
                          className="w-full border border-slate-200 rounded-2xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                          placeholder="Град"
                          value={reqCity}
                          onChange={(e) => setReqCity(e.target.value)}
                        />
                        <input
                          className="w-full border border-slate-200 rounded-2xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                          placeholder="Блок"
                          value={reqBuilding}
                          onChange={(e) => setReqBuilding(e.target.value)}
                        />
                        <input
                          className="w-full border border-slate-200 rounded-2xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                          placeholder="Вход (пример: A)"
                          value={reqEntrance}
                          onChange={(e) => setReqEntrance(e.target.value)}
                        />
                        <input
                          className="w-full border border-slate-200 rounded-2xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                          placeholder="Апартаменти (пример: 12, 13)"
                          value={reqApartmentInput}
                          onChange={(e) => setReqApartmentInput(e.target.value)}
                        />
                        <div className="text-xs text-slate-500">Можеш да въведеш повече от един апартамент, разделени със запетая.</div>

                        <button
                          type="button"
                          onClick={() => addRequestedApartments()}
                          disabled={!reqApartmentInput.trim()}
                          className="w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-60 transition"
                        >
                          Добави апартамент/и
                        </button>
                        {reqSelectedApartments.length > 0 && (
                          <div className="rounded-2xl border border-slate-200 p-3">
                            <div className="text-xs font-semibold text-slate-600 mb-2">Избрани апартаменти</div>
                            <div className="flex flex-wrap gap-2">
                              {reqSelectedApartments.map((apt) => (
                                <button
                                  key={apt}
                                  type="button"
                                  onClick={() => removeRequestedApartment(apt)}
                                  className="rounded-2xl border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                                >
                                  Ап. {apt}
                                </button>
                              ))}
                            </div>
                            <div className="mt-3 text-xs text-slate-500">
                              Избрани: <b>{selectedRequestApartmentLabel || "няма"}</b>
                            </div>
                          </div>
                        )}
                        <button
                          disabled={requiresManagerEmailVerify}
                          className="w-full rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition shadow-sm"
                        >
                          Изпрати заявка
                        </button>
                      </form>
                    )}

                    {requiresManagerEmailVerify && (
                      <p className="text-xs text-amber-700 mt-2">Изисква се потвърден имейл.</p>
                    )}

                    {!isResident && (
                      <p className="text-xs text-slate-500 mt-2">
                        Тази секция е само за Живущи потребители (които искат да станат домоуправител).
                      </p>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-3xl p-4 bg-white shadow-sm">
                    <h2 className="font-semibold mb-2 text-slate-900">Живущ</h2>
                    <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                      Въведи кода на стаята, провери свободните апартаменти и избери всички, които искаш да заявиш.
                    </p>

                    <form onSubmit={joinRoom} className="space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          className="flex-1 border border-slate-200 rounded-2xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                          placeholder="Код (пример: 150-A-123456)"
                          value={codeInput}
                          onChange={(e) => {
                            setCodeInput(e.target.value);
                            setRoomLookup(null);
                            setSelectedApartments([]);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => lookupRoomByCode()}
                          disabled={!codeInput.trim() || lookupLoading}
                          className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-60 transition"
                        >
                          {lookupLoading ? "Проверка..." : "Провери кода"}
                        </button>
                      </div>

                      {roomLookup && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                          <div className="font-semibold text-slate-900">
                            {roomLookup.city || "—"} • Блок {roomLookup.building || "—"} • Вход {roomLookup.entrance || "—"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Апартаменти общо: {roomLookup.apartmentsCount ?? "—"} • Свободни:{" "}
                            {(roomLookup.availableApartments || []).length} • Заети:{" "}
                            {(roomLookup.occupiedApartments || []).length}
                          </div>
                        </div>
                      )}

                      {roomLookup && (
                        <div className="rounded-2xl border border-slate-200 p-3">
                          <div className="text-xs font-semibold text-slate-600 mb-2">Избери апартаментите си</div>
                          {(roomLookup.availableApartments || []).length === 0 ? (
                            <div className="text-sm text-slate-500">В момента няма свободни апартаменти за заявка.</div>
                          ) : (
                            <>
                              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                {(roomLookup.availableApartments || []).map((apt) => {
                                  const selected = selectedApartments.includes(apt);
                                  return (
                                    <button
                                      key={apt}
                                      type="button"
                                      onClick={() => toggleSelectedApartment(apt)}
                                      className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                                        selected
                                          ? "border-slate-900 bg-slate-900 text-white"
                                          : "border-slate-200 bg-white text-slate-900 hover:bg-slate-100"
                                      }`}
                                    >
                                      Ап. {apt}
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="mt-3 text-xs text-slate-500">
                                Избрани: <b>{selectedApartmentLabel || "няма"}</b>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      <button
                        className="w-full rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition shadow-sm"
                      >
                        Изпрати заявка
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isWaitingRoomApproval && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <div className="font-semibold text-amber-900">Заявката е в процес на изчакване</div>
              <div className="mt-2 text-sm text-amber-900/90">
                Домоуправителят още не е прегледал заявката ти. Докато чакаш, тук ще виждаш само нейния статус.
              </div>
              {pendingApartmentLabel && pendingApartmentLabel !== "—" && (
                <div className="mt-3 text-sm text-amber-900/90">
                  Заявени апартаменти: <b>{pendingApartmentLabel}</b>
                </div>
              )}
            </div>
          )}

          {/* Room details */}
          {hasRoom && !isWaitingRoomApproval && (
            <div className="space-y-4">
              {isManager && (
                <div className="border border-slate-200 rounded-3xl p-4 bg-white shadow-sm" id="settings">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-slate-500">Код на стаята</div>
                      <div className="text-xl font-black text-slate-900">{room?.code || "—"}</div>
                      <div className="text-xs text-slate-500">Дай този код на живущите от твоя вход.</div>
                    </div>
                    <button
                      onClick={copyCode}
                      disabled={!room?.code}
                      className="rounded-2xl px-4 py-2 text-sm font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 disabled:opacity-60 transition"
                    >
                      Копирай кода
                    </button>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <div className="font-semibold">Как се използва кодът</div>
                    <ul className="mt-2 list-disc pl-5 space-y-1">
                      <li>Кодът се предоставя на живущите, които трябва да се присъединят към стаята.</li>
                      <li>След присъединяване, домоуправителят одобрява достъпа.</li>
                      <li>Кодът може да бъде сменян само при административна нужда (ако решите да добавите тази функция).</li>
                    </ul>
                  </div>
                </div>
              )}

              {(isManager || isAdmin) && room && (
                <div className="border border-slate-200 rounded-3xl p-4 bg-white shadow-sm" id="settings">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">Апартаменти във входа</div>
                      <div className="text-sm text-slate-600 mt-1">
                        Това се ползва за визуализация и за смислени справки. Броят е фиксиран за входа.
                      </div>
                      <div className="text-xs text-slate-500 mt-2">
                        {room.apartmentsCount === null ? "Още не е зададено." : `Зададено: ${room.apartmentsCount}`}
                        {room.apartmentsCount !== null && !isAdmin && " • (само Админ може да го променя)"}
                      </div>
                    </div>

                    <div className="min-w-[220px]">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Брой апартаменти</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full border border-slate-200 rounded-2xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:bg-slate-100"
                        value={apartmentsCountInput}
                        onChange={(e) => setApartmentsCountInput(e.target.value)}
                        placeholder="пример: 24"
                        disabled={!isAdmin && room.apartmentsCount !== null}
                      />
                      <button
                        onClick={saveApartmentsCount}
                        className="mt-2 w-full rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition shadow-sm"
                        disabled={!isAdmin && room.apartmentsCount !== null}
                      >
                        {room.apartmentsCount === null ? "Запази" : isAdmin ? "Промени (Админ)" : "Заключено"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <div className="font-semibold">Бележка</div>
                    <div className="mt-1">
                      Ако броят апартаменти е неточен, справките и визуализациите може да са подвеждащи. Добра практика е да се зададе веднъж и да остане фиксиран.
                    </div>
                  </div>
                </div>
              )}

              {isAdmin && room && (
                <div className="border border-slate-200 rounded-3xl p-4 bg-white shadow-sm" id="settings">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">IBAN / Получател (Админ)</div>
                      <div className="text-sm text-slate-600 mt-1">
                        Тук Админ може да коригира данните за получаване на средства, без да отваря всички финансови справки.
                      </div>
                      <div className="text-xs text-slate-500 mt-2">
                        Не променя баланса или историята на разходите. Променя само получател и IBAN.
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Получател</label>
                      <input
                        className="w-full border border-slate-200 rounded-2xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                        value={adminFinanceHolderInput}
                        onChange={(e) => setAdminFinanceHolderInput(e.target.value)}
                        placeholder="Име на получателя"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">IBAN</label>
                      <input
                        className="w-full border border-slate-200 rounded-2xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                        value={adminFinanceIbanInput}
                        onChange={(e) => setAdminFinanceIbanInput(e.target.value)}
                        placeholder="IBAN"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={saveAdminPayoutOverride}
                      disabled={adminFinanceSaving}
                      className="rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition shadow-sm"
                    >
                      {adminFinanceSaving ? "Запазване..." : "Запази IBAN/получател"}
                    </button>
                  </div>
                </div>
              )}

              {isManager && (
                <div className="border border-slate-200 rounded-3xl p-4 bg-white shadow-sm" id="requests">
                  <h2 className="font-semibold mb-3 text-slate-900">Чакащи заявки</h2>
                  {safePending.length === 0 ? (
                    <p className="text-sm text-slate-500">Няма чакащи заявки.</p>
                  ) : (
                    <div className="space-y-2">
                      {safePending.map((p) => (
                        <div
                          key={p._id}
                          className="flex flex-col gap-3 border border-slate-200 rounded-2xl p-3 bg-white sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="text-sm text-slate-700 min-w-0">
                            <b className="text-slate-900">{p?.name || "—"}</b> • {p?.email || "—"}
                            {p?.phone ? ` • ${p.phone}` : ""}
                            {p?.apartmentLabel ? ` • ап. ${p.apartmentLabel}` : p?.apartment ? ` • ап. ${p.apartment}` : ""}
                          </div>
                          {isManager && (
                            <div className="flex items-center gap-2 sm:justify-end">
                              <button
                                onClick={() => rejectResident(p._id)}
                                className="text-xs px-3 py-2 rounded-2xl border border-rose-300 text-rose-900 hover:bg-rose-50 transition"
                              >
                                Отхвърли
                              </button>
                              <button
                                onClick={() => approveResident(p._id)}
                                className="text-xs px-3 py-2 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
                              >
                                Одобри
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <div className="font-semibold">Процес на одобрение</div>
                    <ul className="mt-2 list-disc pl-5 space-y-1">
                      <li>Живущ подава заявка с код и един или повече апартаменти.</li>
                      <li>Домоуправителят вижда заявката в списъка и може да я одобри или отхвърли.</li>
                      <li>След одобрение точно тези апартаменти се записват към профила и по тях се смятат плащанията.</li>
                    </ul>
                  </div>
                </div>
              )}

              {!isApproved && !isManager && (
                <div className="border border-amber-200 rounded-3xl p-4 bg-amber-50">
                  <div className="font-semibold text-amber-900">Чакаш одобрение</div>
                  <div className="text-sm text-amber-900/90">
                    Домоуправителят трябва да одобри заявката ти, за да имаш достъп до секциите.
                  </div>
                </div>
              )}

              {isApproved && !isAdmin && (
                <div className="border border-emerald-200 rounded-3xl p-4 bg-emerald-50">
                  <div className="font-semibold text-emerald-900">Одобрен</div>
                  <div className="text-sm text-emerald-900/90">
                    Вече имаш достъп до секциите на входа (ако абонаментът е активен).
                  </div>
                </div>
              )}

              {/* Guidelines / long material */}
              <div id="guidelines" className="border border-slate-200 rounded-3xl p-4 bg-white shadow-sm">
                <div className="font-semibold text-slate-900">Насоки и правила за работа</div>
                <div className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Тази секция е информационна и може да се използва като “вътрешна политика” за входа. Целта е да има ясни правила и очаквания,
                  особено когато има повече живущи и чести ремонти/разходи.
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="font-semibold">Достъп и поверителност</div>
                    <div className="mt-2">
                      Достъпът до данни е свързан със стая и одобрение. Сигналите са конфигурирани така, че живущият да вижда само своите,
                      а домоуправителят да има общ преглед за обработка.
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="font-semibold">Комуникация</div>
                    <div className="mt-2">
                      Обявите са официалният канал. Препоръчва се важните решения и срокове да се публикуват там, за да остават като история.
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="font-semibold">Финансова прозрачност</div>
                    <div className="mt-2">
                      Разходите се добавят с конкретно описание. Балансът е вътрешен индикатор за отчетност и не е банково салдо.
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="font-semibold">Работа по сигнали</div>
                    <div className="mt-2">
                      Домоуправителят сменя статуса на сигналите, за да се вижда прогрес. Това намалява повторни сигнали и излишни въпроси.
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="font-semibold">Добра практика</div>
                  <ul className="mt-2 list-disc pl-5 space-y-1">
                    <li>Публикувай обяви със срок и ясна структура.</li>
                    <li>При разход добавяй описание и повод.</li>
                    <li>При сигнал сменяй статуса, за да има прозрачност.</li>
                    <li>Поддържай броя апартаменти коректен, защото влияе на справките.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      
    </div>
  );
}
