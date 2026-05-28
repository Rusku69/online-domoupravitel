import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../store/auth";
import { PageHeader, HelpCard, ErrorBox } from "../components/PageBits";
import { roleLabel } from "../lib/roles";
import {
  countPaidUnits,
  formatApartmentList,
  getOutstandingApartmentsForUser,
  getPaidEntryApartments,
  getPaymentTargetApartments,
  getUserApartments,
  paymentScopeLabel,
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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
  const userApartmentLabel = useMemo(() => formatApartmentList(getUserApartments(user)), [user]);

  const load = async () => {
    try {
      setLoading(true);
      setErr("");

      const reqs = [];

      if (canAccessRoomData) {
        reqs.push(api.get("/api/payments"));
        reqs.push(api.get("/api/announcements"));
        reqs.push(api.get("/api/signals"));
      } else {
        reqs.push(Promise.resolve({ data: [] }));
        reqs.push(Promise.resolve({ data: [] }));
        reqs.push(Promise.resolve({ data: [] }));
      }

      if (hasRoom) reqs.push(api.get(`/api/rooms/${user.roomId}`));
      else reqs.push(Promise.resolve({ data: null }));

      const res = await Promise.all(reqs);

      setPayments(Array.isArray(res[0].data) ? res[0].data : []);
      setAnnouncements(Array.isArray(res[1].data) ? res[1].data : []);
      setSignals(Array.isArray(res[2].data) ? res[2].data : []);
      setRoomInfo(res[3]?.data || null);
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при зареждане на таблото");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.roomId, user?.memberStatus, user?.role]);

  const residentUnpaid = useMemo(() => {
    if (isManager) return [];

    return payments
      .map((payment) => ({
        payment,
        outstandingApartments: getOutstandingApartmentsForUser(payment, user),
      }))
      .filter((item) => item.outstandingApartments.length > 0);
  }, [isManager, payments, user]);

  const lastAnnouncements = useMemo(() => announcements.slice(0, 3), [announcements]);
  const lastSignals = useMemo(() => signals.slice(0, 3), [signals]);

  const monthOptions = useMemo(() => {
    if (!isManager) return [];

    const keys = new Set();
    for (const payment of payments) {
      const key = monthKey(payment.dateFrom || payment.createdAt);
      if (key) keys.add(key);
    }

    return Array.from(keys).sort((a, b) => (a < b ? 1 : -1));
  }, [isManager, payments]);

  useEffect(() => {
    if (!isManager || selectedMonth || monthOptions.length === 0) return;
    setSelectedMonth(monthOptions[0]);
  }, [isManager, monthOptions, selectedMonth]);

  const managerPaymentList = useMemo(() => {
    if (!isManager) return [];

    const filtered = selectedMonth
      ? payments.filter((payment) => monthKey(payment.dateFrom || payment.createdAt) === selectedMonth)
      : payments;

    return [...filtered].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [isManager, payments, selectedMonth]);

  useEffect(() => {
    if (!isManager) return;

    if (!selectedPaymentId && managerPaymentList.length > 0) {
      setSelectedPaymentId(String(managerPaymentList[0]._id));
      return;
    }

    const exists = managerPaymentList.some((payment) => String(payment._id) === String(selectedPaymentId));
    if (selectedPaymentId && !exists) {
      setSelectedPaymentId(managerPaymentList[0]?._id ? String(managerPaymentList[0]._id) : "");
      setActiveApt(null);
    }
  }, [isManager, managerPaymentList, selectedPaymentId]);

  const selectedPayment = useMemo(() => {
    if (!isManager) return null;
    return managerPaymentList.find((payment) => String(payment._id) === String(selectedPaymentId)) || null;
  }, [isManager, managerPaymentList, selectedPaymentId]);

  const apartmentsCount = useMemo(() => {
    const n = Number(roomInfo?.apartmentsCount || 0);
    return Number.isInteger(n) && n > 0 ? n : null;
  }, [roomInfo]);

  const aptStatus = useMemo(() => {
    if (!isManager || !selectedPayment || !apartmentsCount) return null;

    const targets = getPaymentTargetApartments(selectedPayment);
    const paidByGrouped = {};

    for (const entry of selectedPayment.paidBy || []) {
      const paidApartments = getPaidEntryApartments(entry);
      for (const apt of paidApartments) {
        if (!paidByGrouped[apt]) paidByGrouped[apt] = [];
        paidByGrouped[apt].push({
          name: entry.user?.name || "—",
          apartments: paidApartments,
          method: entry.method || "",
          paidAt: entry.paidAt || null,
        });
      }
    }

    const map = {};
    for (let i = 1; i <= apartmentsCount; i += 1) {
      const apt = String(i);

      if (targets.length && !targets.includes(apt)) {
        map[apt] = { status: "na", paidBy: [] };
        continue;
      }

      const paidBy = paidByGrouped[apt] || [];
      map[apt] = { status: paidBy.length > 0 ? "paid" : "unpaid", paidBy };
    }

    return map;
  }, [isManager, selectedPayment, apartmentsCount]);

  const selectedPaymentAmounts = useMemo(() => {
    if (!isManager || !selectedPayment || !apartmentsCount) return null;

    const amount = Number(selectedPayment.amount) || 0;
    const targets = getPaymentTargetApartments(selectedPayment);
    const totalUnits = targets.length || apartmentsCount;

    return {
      amount,
      totalDue: totalUnits * amount,
      collected: countPaidUnits(selectedPayment) * amount,
      paidUnits: countPaidUnits(selectedPayment),
    };
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
                Това е твоят контролен панел за входа.
                <br />
                {isManager
                  ? "Като домоуправител следиш плащания, обяви и сигнали по апартаменти."
                  : "Като живущ виждаш остатъците по твоите апартаменти, обяви и последни сигнали."}
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
              <Pill tone="sky">Роля: {roleLabel(user.role, user)}</Pill>
              <Pill tone="gray">
                {user.city ? `${user.city} • ` : ""}
                Блок {user.building || "—"} • Вход {user.entrance || "—"}
                {userApartmentLabel && userApartmentLabel !== "—" ? ` • Ап ${userApartmentLabel}` : ""}
              </Pill>
            </div>
          </div>

          {!hasRoom ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
              <div className="text-lg font-black text-amber-900">Първо влез в стая</div>
              <div className="text-sm text-amber-900/90 mt-2">
                За да се появят данните в таблото, трябва да влезеш в стая и да бъдеш одобрен.
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
                Домоуправителят трябва да одобри заявката ти, преди да се заредят секциите на входа.
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
                      Тук виждаш начисленията, по които има оставащи апартаменти за твоя профил.
                    </div>

                    {residentUnpaid.length === 0 ? (
                      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                        Нямаш неплатени начисления.
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        <div className="text-sm">
                          Неплатени начисления: <b>{residentUnpaid.length}</b>
                        </div>

                        {residentUnpaid.slice(0, 5).map(({ payment, outstandingApartments }) => {
                          const amount = Number(payment.amount) || 0;

                          return (
                            <div key={payment._id} className="rounded-3xl border border-slate-200 p-5 bg-white shadow-sm">
                              <div className="font-black text-slate-900">{payment.description}</div>
                              <div className="text-sm text-slate-600 mt-1">
                                {paymentScopeLabel(payment)} • {amount.toFixed(2)} €
                              </div>
                              <div className="text-xs text-slate-500 mt-2">
                                Остават апартаменти: <b>{formatApartmentList(outstandingApartments)}</b>
                              </div>
                              <div className="text-xs text-slate-500 mt-2">
                                Остатък: <b>{(outstandingApartments.length * amount).toFixed(2)} €</b>
                              </div>
                              <div className="text-xs text-slate-500 mt-2">
                                За плащане отвори секцията <b>Плащания</b>.
                              </div>
                            </div>
                          );
                        })}
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
                        {lastAnnouncements.map((announcement) => (
                          <div key={announcement._id} className="rounded-3xl border border-slate-200 p-5 bg-white shadow-sm">
                            <div className="font-black text-slate-900">{announcement.title}</div>
                            <div className="text-xs text-slate-500 mt-1">{fmtDateTime(announcement.createdAt)}</div>
                            <div className="text-sm text-slate-700 mt-3 line-clamp-3 whitespace-pre-wrap leading-relaxed">
                              {announcement.content}
                            </div>
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
                        {lastSignals.map((signal) => (
                          <div key={signal._id} className="rounded-3xl border border-slate-200 p-5 bg-white shadow-sm">
                            <div className="font-black text-slate-900">{signal.title || "Сигнал"}</div>
                            <div className="text-xs text-slate-500 mt-1">{fmtDateTime(signal.createdAt)}</div>
                            <div className="text-sm text-slate-700 mt-3 line-clamp-3 whitespace-pre-wrap leading-relaxed">
                              {signal.description || signal.content || ""}
                            </div>
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
                          Избираш месец и начисление и виждаш кои апартаменти са го платили.
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
                              monthOptions.map((key) => (
                                <option key={key} value={key}>
                                  {monthLabel(key)}
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
                              managerPaymentList.map((payment) => (
                                <option key={payment._id} value={payment._id}>
                                  {payment.description} • {Number(payment.amount).toFixed(2)} € • {paymentScopeLabel(payment)}
                                </option>
                              ))
                            )}
                          </select>

                          {selectedPayment && selectedPaymentAmounts && (
                            <div className="text-xs text-slate-500 mt-2">
                              Събрано: <b>{selectedPaymentAmounts.collected.toFixed(2)} €</b> от{" "}
                              <b>{selectedPaymentAmounts.totalDue.toFixed(2)} €</b> • Платени апартаменти:{" "}
                              <b>{selectedPaymentAmounts.paidUnits}</b>
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

                          return (
                            <button
                              key={apt}
                              type="button"
                              onClick={() => setActiveApt(apt)}
                              className={`rounded-2xl px-2 py-3 text-sm font-black transition hover:scale-[1.02] ${cellTone(
                                info.status
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
                              Начисление: <b>{selectedPayment.description}</b> • {paymentScopeLabel(selectedPayment)}
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
                            Това начисление не важи за ап. {activeApt}.
                          </div>
                        ) : aptStatus?.[activeApt]?.status === "paid" ? (
                          <div className="mt-4 space-y-2">
                            <div className="rounded-2xl border border-emerald-200 bg-white p-4 text-sm text-emerald-900">
                              Платено
                            </div>
                            {(aptStatus?.[activeApt]?.paidBy || []).map((entry, idx) => (
                              <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                                <div className="font-semibold text-slate-900">{entry.name}</div>
                                <div className="text-xs text-slate-500 mt-1">
                                  Апартаменти в записа: {formatApartmentList(entry.apartments)} • Метод:{" "}
                                  {entry.method === "stripe" ? "Stripe" : entry.method || "—"} • {fmtDateTime(entry.paidAt)}
                                </div>
                              </div>
                            ))}
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
                    <li>Провери първо задълженията и последните обяви.</li>
                    <li>Ако имаш няколко апартамента, гледай остатъците по всички.</li>
                    <li>Натисни “Обнови”, ако очакваш нови данни.</li>
                  </ul>
                </HelpCard>

                <HelpCard title="Полезно">
                  {isManager
                    ? "При едно начисление зеленото означава, че конкретният апартамент вече е платил, а червеното — че още не е."
                    : "Таблото събира само най-важното. За детайлно плащане отвори секцията “Плащания”."}
                </HelpCard>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
