import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../store/auth";
import SubscriptionBanner from "../components/SubscriptionBanner";
import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";

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
  const [apartmentInput, setApartmentInput] = useState("");
  const [apartmentsCountInput, setApartmentsCountInput] = useState("");

  // manager request form
  const [reqCity, setReqCity] = useState("");
  const [reqBuilding, setReqBuilding] = useState("");
  const [reqEntrance, setReqEntrance] = useState("");
  const [reqApartment, setReqApartment] = useState("");

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const isResident = user?.role === "resident";

  const isApproved = user?.memberStatus === "approved";
  const hasRoom = !!user?.roomId;

  const safePending = useMemo(() => (pending || []).filter(Boolean), [pending]);

  const loadRoomInfo = async () => {
    if (!user) return;
    try {
      setErr("");
      setMsg("");
      setLoading(true);

      if (!user.roomId) {
        setRoom(null);
        setPending([]);
        return;
      }

      const roomRes = await api.get(`/api/rooms/${user.roomId}`);
      setRoom(roomRes.data || null);

      const ac = roomRes.data?.apartmentsCount;
      if (ac !== null && ac !== undefined && !apartmentsCountInput) {
        setApartmentsCountInput(String(ac));
      }

      if (isManager || isAdmin) {
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

  // изпращане на manager request
  const sendManagerRequest = async (e) => {
    e.preventDefault();
    try {
      setErr("");
      setMsg("");

      if (!reqCity.trim() || !reqBuilding.trim() || !reqEntrance.trim()) {
        return setErr("Попълни град, блок и вход.");
      }

      if (!reqApartment.trim()) {
        return setErr("Попълни апартамент (домоуправителят трябва да е живущ).");
      }

      await api.post("/api/rooms/manager-request", {
        city: reqCity.trim(),
        building: reqBuilding.trim(),
        entrance: reqEntrance.trim().toUpperCase(),
        apartment: reqApartment.trim(),
      });

      setMsg("Заявката за домоуправител е изпратена. Изчакай admin одобрение.");
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
      if (!apartmentInput.trim()) return setErr("Въведи апартамент.");

      await api.post("/api/rooms/join", {
        code: codeInput.trim(),
        apartment: apartmentInput.trim(),
      });

      setMsg("Заявката е изпратена. Изчакай одобрение от домоуправителя.");
      await fetchUser();
      await loadRoomInfo();
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при присъединяване");
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

  if (!user) return null;

  const subActive = !!room?.subscription?.active;
  const managerRequestStatus = user?.managerRequestStatus || "none";

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
                  {user.apartment ? ` • Ап: ${user.apartment}` : ""}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge tone="sky">{user.role}</Badge>
                  <Badge tone={isApproved ? "green" : "yellow"}>членство: {user.memberStatus || "pending"}</Badge>
                  {hasRoom && (
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
                <div className="text-sm font-semibold text-slate-900">{hasRoom ? "Активна" : "Няма"}</div>
              </div>
            </div>

            {/* Page index (за материал и по-дълго скролване) */}
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">Навигация</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <a href="#status" className="rounded-full border border-slate-300 px-3 py-1 hover:bg-white transition">
                  Статус
                </a>
                <a href="#join" className="rounded-full border border-slate-300 px-3 py-1 hover:bg-white transition">
                  Достъп
                </a>
                <a
                  href="#subscription"
                  className="rounded-full border border-slate-300 px-3 py-1 hover:bg-white transition"
                >
                  Абонамент
                </a>
                <a
                  href="#settings"
                  className="rounded-full border border-slate-300 px-3 py-1 hover:bg-white transition"
                >
                  Настройки
                </a>
                <a
                  href="#requests"
                  className="rounded-full border border-slate-300 px-3 py-1 hover:bg-white transition"
                >
                  Заявки
                </a>
                <a
                  href="#guidelines"
                  className="rounded-full border border-slate-300 px-3 py-1 hover:bg-white transition"
                >
                  Насоки
                </a>
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

            {/* Status block */}
            <div id="status" className="rounded-2xl border border-slate-200 p-4 bg-white mb-4 shadow-sm">
              <div className="font-semibold text-slate-900">Статус на достъп</div>
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
            </div>

            {/* Subscription banner */}
            {hasRoom && room && (
              <div id="subscription" className="mb-4">
                <SubscriptionBanner room={room} />
              </div>
            )}

            {(isManager || isAdmin) && hasRoom && !subActive && (
              <div className="mt-3" id="subscription">
                <Link
                  to="/subscription"
                  className="inline-flex rounded-2xl px-4 py-2.5 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
                >
                  Поднови абонамент
                </Link>
                <div className="text-xs text-slate-600 mt-2">Подновяването го прави домоуправителят (или admin).</div>
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
                      Подай заявка към admin: въведи град/блок/вход и апартамент. След одобрение ставаш домоуправител и
                      стаята се създава автоматично.
                    </p>

                    {isResident && managerRequestStatus === "pending" ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        Имаш изпратена заявка. Изчакай admin.
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
                          placeholder="Апартамент (пример: 12)"
                          value={reqApartment}
                          onChange={(e) => setReqApartment(e.target.value)}
                        />

                        <button className="w-full rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 transition shadow-sm">
                          Изпрати заявка
                        </button>
                      </form>
                    )}

                    {!isResident && (
                      <p className="text-xs text-slate-500 mt-2">
                        Тази секция е само за resident потребители (които искат да станат домоуправител).
                      </p>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-3xl p-4 bg-white shadow-sm">
                    <h2 className="font-semibold mb-2 text-slate-900">Живущ</h2>
                    <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                      Въведи код за стаята и апартамент. Домоуправителят ще одобри заявката и след това ще имаш достъп.
                    </p>

                    <form onSubmit={joinRoom} className="space-y-2">
                      <input
                        className="w-full border border-slate-200 rounded-2xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                        placeholder="Код (пример: 150-A-123456)"
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value)}
                      />
                      <input
                        className="w-full border border-slate-200 rounded-2xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                        placeholder="Апартамент (пример: 12)"
                        value={apartmentInput}
                        onChange={(e) => setApartmentInput(e.target.value)}
                      />
                      <button className="w-full rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 transition shadow-sm">
                        Влез
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Room details */}
          {hasRoom && (
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
                        {room.apartmentsCount !== null && !isAdmin && " • (само admin може да го променя)"}
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
                        {room.apartmentsCount === null ? "Запази" : isAdmin ? "Промени (admin)" : "Заключено"}
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

              {(isManager || isAdmin) && (
                <div className="border border-slate-200 rounded-3xl p-4 bg-white shadow-sm" id="requests">
                  <h2 className="font-semibold mb-3 text-slate-900">Чакащи заявки</h2>
                  {safePending.length === 0 ? (
                    <p className="text-sm text-slate-500">Няма чакащи заявки.</p>
                  ) : (
                    <div className="space-y-2">
                      {safePending.map((p) => (
                        <div key={p._id} className="flex items-center justify-between border border-slate-200 rounded-2xl p-3 bg-white">
                          <div className="text-sm text-slate-700">
                            <b className="text-slate-900">{p?.name || "—"}</b> • {p?.email || "—"}
                            {p?.phone ? ` • ${p.phone}` : ""}
                            {p?.apartment ? ` • ап. ${p.apartment}` : ""}
                          </div>
                          {isManager && (
                            <button
                              onClick={() => approveResident(p._id)}
                              className="text-xs px-3 py-2 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
                            >
                              Одобри
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <div className="font-semibold">Процес на одобрение</div>
                    <ul className="mt-2 list-disc pl-5 space-y-1">
                      <li>Живущ подава заявка с код и апартамент.</li>
                      <li>Домоуправителят вижда заявката в списъка и одобрява.</li>
                      <li>След одобрение потребителят получава достъп до секциите на входа.</li>
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

              {isApproved && (
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
