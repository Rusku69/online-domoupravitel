import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../store/auth";
import { PageHeader, HelpCard, ErrorBox } from "../components/PageBits";
import { roleLabel } from "../lib/roles";

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

function cellTone(status) {
  if (status === "paid") return "bg-emerald-600 text-white";
  if (status === "unpaid") return "bg-rose-600 text-white";
  return "bg-slate-200 text-slate-600";
}

function cellSubTone(status) {
  if (status === "paid") return "bg-emerald-50 border-emerald-200";
  if (status === "unpaid") return "bg-rose-50 border-rose-200";
  return "bg-slate-50 border-slate-200";
}

function monthKey(dateLike) {
  if (!dateLike) return null;
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(key) {
  if (!key) return "—";
  const [y, m] = key.split("-");
  const names = {
    "01": "Януари",
    "02": "Февруари",
    "03": "Март",
    "04": "Април",
    "05": "Май",
    "06": "Юни",
    "07": "Юли",
    "08": "Август",
    "09": "Септември",
    "10": "Октомври",
    "11": "Ноември",
    "12": "Декември",
  };
  return `${names[m] || m} ${y}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";

  const [payments, setPayments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [signals, setSignals] = useState([]);

  const [roomInfo, setRoomInfo] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
  const [activeApt, setActiveApt] = useState(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const hasRoom = !!user?.roomId;
  const approved = user?.memberStatus === "approved";
  const canAccessRoomData = hasRoom && approved;

  const load = async () => {
    try {
      setLoading(true);
      setErr("");

      // reset ако нямаш достъп
      if (!canAccessRoomData) {
        setPayments([]);
        setAnnouncements([]);
        setSignals([]);
      }

      const reqs = [];

      // protected: само ако имаш room + approved
      if (canAccessRoomData) {
        reqs.push(api.get("/api/payments"));
        reqs.push(api.get("/api/announcements"));
        reqs.push(api.get("/api/signals"));
      } else {
        reqs.push(Promise.resolve({ data: [] }));
        reqs.push(Promise.resolve({ data: [] }));
        reqs.push(Promise.resolve({ data: [] }));
      }

      // room info може да го искаш ако имаш roomId (дори да не си approved още)
      if (hasRoom) reqs.push(api.get(`/api/rooms/${user.roomId}`));
      else reqs.push(Promise.resolve({ data: null }));

      const res = await Promise.all(reqs);

      setPayments(Array.isArray(res[0].data) ? res[0].data : []);
      setAnnouncements(Array.isArray(res[1].data) ? res[1].data : []);
      setSignals(Array.isArray(res[2].data) ? res[2].data : []);
      setRoomInfo(res[3]?.data || null);
    } catch (e) {
      const msg = e?.response?.data?.message || "Грешка при зареждане на таблото";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.roomId, user?.memberStatus, user?.role]);

  const myId = user?.id || user?._id;

  const paidSet = useMemo(() => {
    const set = new Set();
    for (const p of payments) {
      const paid = (p.paidBy || []).some((x) => String(x.user?._id || x.user) === String(myId));
      if (paid) set.add(String(p._id));
    }
    return set;
  }, [payments, myId]);

  const myUnpaid = useMemo(() => {
    if (isManager) return [];
    return payments.filter((p) => !paidSet.has(String(p._id)));
  }, [payments, paidSet, isManager]);

  const lastAnnouncements = useMemo(() => announcements.slice(0, 3), [announcements]);
  const lastSignals = useMemo(() => signals.slice(0, 3), [signals]);

  const monthOptions = useMemo(() => {
    if (!isManager) return [];
    const keys = new Set();
    for (const p of payments) {
      const k = monthKey(p.dateFrom || p.createdAt);
      if (k) keys.add(k);
    }
    const arr = Array.from(keys);
    arr.sort((a, b) => (a < b ? 1 : -1));
    return arr;
  }, [payments, isManager]);

  useEffect(() => {
    if (!isManager) return;
    if (!selectedMonth && monthOptions.length > 0) {
      setSelectedMonth(monthOptions[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManager, monthOptions.length]);

  const managerPaymentList = useMemo(() => {
    if (!isManager) return [];
    let arr = [...payments];

    if (selectedMonth) {
      arr = arr.filter((p) => monthKey(p.dateFrom || p.createdAt) === selectedMonth);
    }

    arr.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return arr;
  }, [payments, isManager, selectedMonth]);

  useEffect(() => {
    if (!isManager) return;
    if (!selectedPaymentId && managerPaymentList.length > 0) {
      setSelectedPaymentId(String(managerPaymentList[0]._id));
    }
    const exists = managerPaymentList.some((p) => String(p._id) === String(selectedPaymentId));
    if (selectedPaymentId && !exists && managerPaymentList.length > 0) {
      setSelectedPaymentId(String(managerPaymentList[0]._id));
      setActiveApt(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManager, managerPaymentList.length, selectedMonth]);

  const selectedPayment = useMemo(() => {
    if (!isManager) return null;
    return managerPaymentList.find((p) => String(p._id) === String(selectedPaymentId)) || null;
  }, [isManager, managerPaymentList, selectedPaymentId]);

  const apartmentsCount = useMemo(() => {
    const n = roomInfo?.apartmentsCount;
    return Number.isFinite(Number(n)) && Number(n) > 0 ? Number(n) : null;
  }, [roomInfo]);

  const aptStatus = useMemo(() => {
    if (!isManager || !selectedPayment || !apartmentsCount) return null;

    const targetApt = String(selectedPayment.apartment || "").trim();

    const paidByGrouped = {};
    for (const x of selectedPayment.paidBy || []) {
      const apt = String(x.user?.apartment || "").trim();
      if (!apt) continue;
      if (!paidByGrouped[apt]) paidByGrouped[apt] = [];
      paidByGrouped[apt].push({
        name: x.user?.name || "—",
        apartment: apt,
        method: x.method || "",
        paidAt: x.paidAt || null,
      });
    }

    const map = {};
    for (let i = 1; i <= apartmentsCount; i++) {
      const apt = String(i);

      if (targetApt && targetApt !== apt) {
        map[apt] = { status: "na", paidBy: [] };
        continue;
      }

      const paidBy = paidByGrouped[apt] || [];
      map[apt] = { status: paidBy.length > 0 ? "paid" : "unpaid", paidBy };
    }

    return map;
  }, [isManager, selectedPayment, apartmentsCount]);

  // суми за избраното начисление (само за manager)
  const selectedPaymentAmounts = useMemo(() => {
    if (!isManager || !selectedPayment || !apartmentsCount) return null;

    const amount = Number(selectedPayment.amount) || 0;
    const paidCount = (selectedPayment.paidBy || []).length;

    const collected = paidCount * amount;

    // ако начислението е за конкретен апартамент -> общо = amount
    // ако е за всички -> общо = apartmentsCount * amount
    const totalDue = String(selectedPayment.apartment || "").trim() ? amount : apartmentsCount * amount;

    return { collected, totalDue, amount, paidCount };
  }, [isManager, selectedPayment, apartmentsCount]);

  const roomBalance = useMemo(() => {
    const b = roomInfo?.finance?.balance;
    return Number.isFinite(Number(b)) ? Number(b) : null;
  }, [roomInfo]);

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <PageHeader
            title="Табло"
            subtitle={
              <>
                Това е твоят контролен панел за входа — бърз преглед на най-важното.
                <br />
                {isManager
                  ? "Като домоуправител: следиш плащания, обяви и сигнали."
                  : "Като живущ: виждаш задължения, обяви и последни сигнали."}
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

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={hasRoom ? "green" : "red"}>Стая: {hasRoom ? "активна" : "няма"}</Pill>
              <Pill tone={approved ? "green" : "yellow"}>Достъп: {approved ? "одобрен" : "чака"}</Pill>
              <Pill tone="sky">Роля: {roleLabel(user.role)}</Pill>
              <Pill tone="gray">
                {user.city ? `${user.city} • ` : ""}
                Блок {user.building || "—"} • Вход {user.entrance || "—"} {user.apartment ? `• Ап ${user.apartment}` : ""}
              </Pill>
            </div>

            <div className="text-xs text-slate-500 mt-3">
              Ако нямаш стая или не си одобрен, таблото няма да зарежда плащания/обяви/сигнали (за да няма 403).
            </div>
          </div>

          {/* Friendly gate screen */}
          {!hasRoom ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
              <div className="text-lg font-black text-amber-900">Първо влез в стая</div>
              <div className="text-sm text-amber-900/90 mt-2">
                За да се появят плащания/обяви/сигнали, трябва да въведеш код за стая и апартамент.
              </div>
              <Link
                to="/room"
                className="inline-flex items-center justify-center mt-4 rounded-2xl px-5 py-3 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
              >
                Отиди към “Стая”
              </Link>
            </div>
          ) : !approved ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
              <div className="text-lg font-black text-amber-900">Чакаш одобрение</div>
              <div className="text-sm text-amber-900/90 mt-2">
                Вече си подал заявка към стаята. Домоуправителят трябва да те одобри, за да видиш съдържанието.
              </div>
              <Link
                to="/room"
                className="inline-flex items-center justify-center mt-4 rounded-2xl px-5 py-3 text-sm font-semibold border border-amber-300 text-amber-900 hover:bg-amber-100 transition"
              >
                Виж статуса в “Стая”
              </Link>
            </div>
          ) : loading ? (
            <div className="text-sm text-slate-500">Зареждане...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {!isManager ? (
                <div className="lg:col-span-2 space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="font-black text-slate-900">Моите задължения</div>
                    <div className="text-sm text-slate-600 mt-2">
                      Това са начисленията, които виждаш (общи + само за твоя апартамент).
                    </div>

                    {myUnpaid.length === 0 ? (
                      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                        Нямаш неплатени начисления (по данните в системата).
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        <div className="text-sm">
                          Неплатени: <b>{myUnpaid.length}</b>
                        </div>
                        {myUnpaid.slice(0, 5).map((p) => (
                          <div key={p._id} className="rounded-3xl border border-slate-200 p-5 bg-white shadow-sm">
                            <div className="font-black text-slate-900">{p.description}</div>
                            <div className="text-sm text-slate-600 mt-1">
                              {p.apartment ? `Само за ап. ${p.apartment}` : "За всички апартаменти"} •{" "}
                              {Number(p.amount).toFixed(2)} €
                            </div>
                            <div className="text-xs text-slate-500 mt-2">
                              Период: {fmtDate(p.dateFrom)} → {fmtDate(p.dateTo)}
                            </div>
                            <div className="text-xs text-slate-500 mt-2">
                              За плащане отвори секцията <b>Плащания</b>.
                            </div>
                          </div>
                        ))}
                        {myUnpaid.length > 5 && (
                          <div className="text-xs text-slate-500">
                            Показвам само първите 5. Останалите са в “Плащания”.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="font-black text-slate-900">Последни обяви</div>
                    <div className="text-sm text-slate-600 mt-2">Най-новите 3 обяви от домоуправителя.</div>

                    {lastAnnouncements.length === 0 ? (
                      <div className="text-sm text-slate-500 mt-4">Няма обяви.</div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {lastAnnouncements.map((a) => (
                          <div key={a._id} className="rounded-3xl border border-slate-200 p-5 bg-white shadow-sm">
                            <div className="font-black text-slate-900">{a.title}</div>
                            <div className="text-xs text-slate-500 mt-1">{fmtDateTime(a.createdAt)}</div>
                            <div className="text-sm text-slate-700 mt-3 line-clamp-3 whitespace-pre-wrap leading-relaxed">
                              {a.content}
                            </div>
                            <div className="text-xs text-slate-500 mt-3">За целия текст: секция “Обяви”.</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="font-black text-slate-900">Последни сигнали</div>
                    <div className="text-sm text-slate-600 mt-2">Последните 3 сигнала от твоя вход.</div>

                    {lastSignals.length === 0 ? (
                      <div className="text-sm text-slate-500 mt-4">Няма сигнали.</div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {lastSignals.map((s) => (
                          <div key={s._id} className="rounded-3xl border border-slate-200 p-5 bg-white shadow-sm">
                            <div className="font-black text-slate-900">{s.title || "Сигнал"}</div>
                            <div className="text-xs text-slate-500 mt-1">{fmtDateTime(s.createdAt)}</div>
                            <div className="text-sm text-slate-700 mt-3 line-clamp-3 whitespace-pre-wrap leading-relaxed">
                              {s.description || s.content || ""}
                            </div>
                            <div className="text-xs text-slate-500 mt-3">За детайли: секция “Сигнали”.</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="lg:col-span-2 space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-black text-slate-900">Апартаменти: статус по начисление</div>
                        <div className="text-sm text-slate-600 mt-2">
                          Избираш месец и начисление и виждаш кои апартаменти са платили.
                        </div>
                        <div className="text-xs text-slate-500 mt-2">
                          Зелен = платено • Червен = неплатено • Сив = не важи
                        </div>
                      </div>

                      <div className="min-w-[300px] space-y-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Месец</label>
                          <select
                            className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                            value={selectedMonth}
                            onChange={(e) => {
                              setSelectedMonth(e.target.value);
                              setSelectedPaymentId("");
                              setActiveApt(null);
                            }}
                          >
                            {monthOptions.length === 0 ? (
                              <option value="">Няма данни</option>
                            ) : (
                              monthOptions.map((k) => (
                                <option key={k} value={k}>
                                  {monthLabel(k)}
                                </option>
                              ))
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Избери начисление</label>
                          <select
                            className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                            value={selectedPaymentId}
                            onChange={(e) => {
                              setSelectedPaymentId(e.target.value);
                              setActiveApt(null);
                            }}
                          >
                            {managerPaymentList.length === 0 ? (
                              <option value="">Няма начисления за месеца</option>
                            ) : (
                              managerPaymentList.map((p) => (
                                <option key={p._id} value={p._id}>
                                  {p.description} • {Number(p.amount).toFixed(2)} €
                                  {p.apartment ? ` • (ап. ${p.apartment})` : " • (за всички)"}
                                </option>
                              ))
                            )}
                          </select>

                          <div className="text-xs text-slate-500 mt-2">
                            Период: {fmtDate(selectedPayment?.dateFrom)} → {fmtDate(selectedPayment?.dateTo)}
                          </div>

                          {selectedPaymentAmounts && (
                            <div className="text-xs text-slate-500 mt-2">
                              Събрано: <b>{Number(selectedPaymentAmounts.collected).toFixed(2)} €</b> от{" "}
                              <b>{Number(selectedPaymentAmounts.totalDue).toFixed(2)} €</b>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {!apartmentsCount ? (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        Няма зададен брой апартаменти за входа. Задай го в “Стая”.
                      </div>
                    ) : !selectedPayment ? (
                      <div className="mt-4 text-sm text-slate-500">Няма начисление за показване.</div>
                    ) : (
                      <div className="mt-5 grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                        {Array.from({ length: apartmentsCount }, (_, i) => {
                          const apt = String(i + 1);
                          const info = aptStatus?.[apt] || { status: "na", paidBy: [] };
                          const status = info.status;

                          return (
                            <button
                              key={apt}
                              type="button"
                              onClick={() => setActiveApt(apt)}
                              className={`relative rounded-2xl px-2 py-3 text-sm font-black transition hover:scale-[1.02] ${cellTone(
                                status
                              )}`}
                            >
                              {apt}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {apartmentsCount && selectedPayment && activeApt && (
                      <div className={`mt-5 rounded-3xl border p-5 ${cellSubTone(aptStatus?.[activeApt]?.status)}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-black text-slate-900">Детайл за ап. {activeApt}</div>
                            <div className="text-sm text-slate-700 mt-1">
                              Начисление: <b>{selectedPayment.description}</b> • {Number(selectedPayment.amount).toFixed(2)} €
                            </div>
                            <div className="text-xs text-slate-500 mt-2">
                              Период: {fmtDate(selectedPayment.dateFrom)} → {fmtDate(selectedPayment.dateTo)}
                            </div>
                          </div>

                          <button
                            onClick={() => setActiveApt(null)}
                            className="rounded-2xl px-3 py-2 text-xs font-semibold border border-slate-300 text-slate-900 hover:bg-white transition"
                          >
                            Затвори
                          </button>
                        </div>

                        {aptStatus?.[activeApt]?.status === "na" ? (
                          <div className="mt-3 text-sm text-slate-600">
                            Това начисление е за друг апартамент ({selectedPayment.apartment}). Този апартамент не участва.
                          </div>
                        ) : aptStatus?.[activeApt]?.status === "paid" ? (
                          <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4 text-sm text-emerald-900">
                            Платено
                          </div>
                        ) : (
                          <div className="mt-4 rounded-2xl border border-rose-200 bg-white p-4 text-sm text-rose-900">
                            Неплатено
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="font-black text-slate-900">Бърз преглед</div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="rounded-3xl border border-slate-200 p-5">
                        <div className="text-xs text-slate-500">Баланс</div>
                        <div className="text-2xl font-black text-slate-900">
                          {roomBalance === null ? "—" : `${roomBalance.toFixed(2)} €`}
                        </div>
                      </div>
                      <div className="rounded-3xl border border-slate-200 p-5">
                        <div className="text-xs text-slate-500">Начисления</div>
                        <div className="text-2xl font-black text-slate-900">{payments.length}</div>
                      </div>
                      <div className="rounded-3xl border border-slate-200 p-5">
                        <div className="text-xs text-slate-500">Обяви</div>
                        <div className="text-2xl font-black text-slate-900">{announcements.length}</div>
                      </div>
                      <div className="rounded-3xl border border-slate-200 p-5">
                        <div className="text-xs text-slate-500">Сигнали</div>
                        <div className="text-2xl font-black text-slate-900">{signals.length}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <HelpCard title="Как да ползваш таблото">
                  <ul className="list-disc pl-5 mt-2 space-y-2">
                    <li>Първо виж задължения/сигнали.</li>
                    <li>Чети обявите редовно.</li>
                    <li>Ако липсва нещо — натисни “Обнови”.</li>
                  </ul>
                </HelpCard>

                <HelpCard title="Бърз навик">
                  Ако си живущ: проверявай таблото 10 секунди — ще знаеш дали има неплатено/обява/сигнал.
                </HelpCard>
              </div>
            </div>
          )}
        </div>
      </div>

      
    </div>
  );
}
