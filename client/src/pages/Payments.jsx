import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../store/auth";
import { PageHeader, HelpCard, ErrorBox, SuccessBox } from "../components/PageBits";
import {
  countPaidUnits,
  formatApartmentList,
  getOutstandingApartmentsForUser,
  getPaidApartmentsForUser,
  getPaidEntryApartments,
  getPaymentTargetApartments,
  getUserApartments,
  normalizeApartmentList,
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

function residentState(meta) {
  if (!meta?.owedApartments?.length) return "unpaid";
  if (!meta.outstandingApartments.length && meta.paidApartments.length) return "paid";
  if (meta.paidApartments.length) return "partial";
  return "unpaid";
}

export default function Payments() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [apartment, setApartment] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [q, setQ] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCount, setShowCount] = useState(50);

  const ownedApartments = useMemo(() => getUserApartments(user), [user]);

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      const res = await api.get("/api/payments");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при зареждане");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const paid = params.get("paid") === "1";
      const canceled = params.get("canceled") === "1";

      if (paid) {
        setMsg("Плащането е успешно. Благодарим!");
        load();
      } else if (canceled) {
        setErr("Плащането беше отказано/прекъснато.");
      }

      if (paid || canceled) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const residentMetaById = useMemo(() => {
    const map = new Map();

    for (const payment of items) {
      const targets = getPaymentTargetApartments(payment);
      const owedApartments = targets.length
        ? ownedApartments.filter((apt) => targets.includes(apt))
        : ownedApartments;
      const paidApartments = getPaidApartmentsForUser(payment, user);
      const outstandingApartments = getOutstandingApartmentsForUser(payment, user);

      map.set(String(payment._id), {
        owedApartments,
        paidApartments,
        outstandingApartments,
      });
    }

    return map;
  }, [items, ownedApartments, user]);

  const createPayment = async (e) => {
    e.preventDefault();
    try {
      setErr("");
      setMsg("");

      await api.post("/api/payments/create", {
        description,
        amount,
        apartments: normalizeApartmentList(apartment),
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
      });

      setMsg("Начислението е добавено.");
      setDescription("");
      setAmount("");
      setApartment("");
      setDateFrom("");
      setDateTo("");
      await load();
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Грешка при създаване");
    }
  };

  const payWithStripe = async (id) => {
    try {
      setErr("");
      setMsg("");

      const res = await api.post(`/api/payments/${id}/checkout`);
      const url = res?.data?.url;

      if (!url) {
        setErr("Липсва Stripe checkout URL.");
        return;
      }

      window.location.href = url;
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при Stripe плащане");
    }
  };

  const filtered = useMemo(() => {
    const query = String(q || "").trim().toLowerCase();

    return items.filter((payment) => {
      const targets = getPaymentTargetApartments(payment);
      const isForAll = targets.length === 0;
      const isSpecific = targets.length > 0;

      if (scopeFilter === "all_apts" && !isForAll) return false;
      if (scopeFilter === "single_apt" && !isSpecific) return false;

      const paidUnits = countPaidUnits(payment);
      const paidAny = paidUnits > 0;

      if (statusFilter === "paid_any" && !paidAny) return false;
      if (statusFilter === "unpaid_all" && paidAny) return false;

      if (!isManager) {
        const meta = residentMetaById.get(String(payment._id));
        const state = residentState(meta);

        if (statusFilter === "paid_by_me" && state === "unpaid") return false;
        if (statusFilter === "unpaid_by_me" && state === "paid") return false;
      }

      if (!query) return true;

      const hay = [
        payment?.description || "",
        paymentScopeLabel(payment),
        fmtDate(payment?.dateFrom),
        fmtDate(payment?.dateTo),
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(query);
    });
  }, [items, q, scopeFilter, statusFilter, isManager, residentMetaById]);

  const shortList = useMemo(() => filtered.slice(0, showCount), [filtered, showCount]);

  const stats = useMemo(() => {
    let paidAny = 0;
    let unpaidAll = 0;

    for (const payment of items) {
      if (countPaidUnits(payment) > 0) paidAny += 1;
      else unpaidAll += 1;
    }

    return {
      total: items.length,
      filteredCount: filtered.length,
      paidAny,
      unpaidAll,
    };
  }, [items, filtered]);

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <PageHeader
            title="Плащания"
            subtitle={
              <>
                Тук се управляват начисленията за входа.
                <br />
                Ако един профил има 2 или 3 апартамента, начисленията и плащанията се смятат по всеки апартамент поотделно.
                <br />
                Плащането става през Stripe Checkout като гост. Всички суми са в EUR (€).
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
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="font-black text-slate-900">Обобщение</div>
                <div className="text-sm text-slate-600 mt-2">
                  Начисление може да е за всички апартаменти, за един апартамент или за няколко конкретни апартамента.
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs text-slate-500">Общо начисления</div>
                    <div className="text-2xl font-black text-slate-900">{stats.total}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs text-slate-500">Показани</div>
                    <div className="text-2xl font-black text-slate-900">{stats.filteredCount}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs text-slate-500">Има плащания</div>
                    <div className="text-2xl font-black text-slate-900">{stats.paidAny}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs text-slate-500">Без плащания</div>
                    <div className="text-2xl font-black text-slate-900">{stats.unpaidAll}</div>
                  </div>
                </div>
              </div>

              {isManager && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="font-black text-slate-900">Ново начисление</div>
                  <div className="text-sm text-slate-600 mt-2">
                    Остави полето за апартаменти празно за общо начисление или въведи един/няколко апартамента, разделени със запетая.
                  </div>

                  <form onSubmit={createPayment} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Описание</label>
                      <input
                        className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="пример: Почистване, Осветление, Асансьор..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Сума (EUR)</label>
                      <input
                        className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="пример: 5"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Апартаменти (празно = за всички)
                      </label>
                      <input
                        className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                        value={apartment}
                        onChange={(e) => setApartment(e.target.value)}
                        placeholder="пример: 12 или 12, 13"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">От дата (по желание)</label>
                      <input
                        type="date"
                        className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">До дата (по желание)</label>
                      <input
                        type="date"
                        className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <button className="w-full rounded-2xl px-4 py-3.5 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm">
                        Запази начисление
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="font-black text-slate-900">Начисления</div>
                <div className="text-sm text-slate-600 mt-2">
                  {isManager
                    ? "Виждаш всички начисления в стаята и колко апартамента са ги платили."
                    : "Виждаш само начисленията, които важат за твоите апартаменти."}
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Търсене</label>
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="пример: почистване, ап. 12, асансьор..."
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Обхват</label>
                    <select
                      value={scopeFilter}
                      onChange={(e) => setScopeFilter(e.target.value)}
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                    >
                      <option value="all">Всички</option>
                      <option value="all_apts">Само за всички</option>
                      <option value="single_apt">Само за апартамент/и</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Показване</label>
                    <select
                      value={showCount}
                      onChange={(e) => setShowCount(Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                    >
                      {[25, 50, 100].map((n) => (
                        <option key={n} value={n}>
                          {n} начисления
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Статус</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                    >
                      <option value="all">Всички</option>
                      <option value="paid_any">Има плащания</option>
                      <option value="unpaid_all">Без плащания</option>
                      {!isManager && <option value="paid_by_me">Платени/частично платени от мен</option>}
                      {!isManager && <option value="unpaid_by_me">Имат остатък за мен</option>}
                    </select>
                  </div>

                  <div className="md:col-span-2 flex items-end">
                    <button
                      onClick={() => {
                        setQ("");
                        setScopeFilter("all");
                        setStatusFilter("all");
                        setShowCount(50);
                      }}
                      className="w-full rounded-2xl px-4 py-3.5 text-sm font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 transition"
                    >
                      Изчисти филтри
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="text-sm text-slate-500 mt-4">Зареждане...</div>
                ) : shortList.length === 0 ? (
                  <div className="text-sm text-slate-500 mt-4">Няма начисления по тези критерии.</div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {shortList.map((payment) => {
                      const meta = residentMetaById.get(String(payment._id));
                      const state = residentState(meta);
                      const amountNum = Number(payment.amount) || 0;
                      const paidUnits = countPaidUnits(payment);
                      const collected = paidUnits * amountNum;

                      return (
                        <div key={payment._id} className="rounded-3xl border border-slate-200 p-5 bg-white shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-black text-slate-900">{payment.description}</div>
                              <div className="text-sm text-slate-600 mt-1">
                                {paymentScopeLabel(payment)} • {amountNum.toFixed(2)} €
                              </div>
                              <div className="text-xs text-slate-500 mt-2">
                                Период: {fmtDate(payment.dateFrom)} → {fmtDate(payment.dateTo)}
                              </div>

                              {isManager ? (
                                <div className="text-xs text-slate-500 mt-2">
                                  Платени апартаменти: <b>{paidUnits}</b> • Събрано: <b>{collected.toFixed(2)} €</b>
                                </div>
                              ) : (
                                <div className="text-xs text-slate-500 mt-2">
                                  Твоите апартаменти: <b>{formatApartmentList(meta?.owedApartments || [])}</b>
                                </div>
                              )}
                            </div>

                            {!isManager && (
                              <div className="text-right">
                                <div
                                  className={`inline-flex text-xs px-2.5 py-1 rounded-full border ${
                                    state === "paid"
                                      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                                      : state === "partial"
                                      ? "bg-amber-50 text-amber-900 border-amber-200"
                                      : "bg-rose-50 text-rose-900 border-rose-200"
                                  }`}
                                >
                                  {state === "paid" ? "Платено" : state === "partial" ? "Частично платено" : "Неплатено"}
                                </div>
                              </div>
                            )}
                          </div>

                          {meta?.owedApartments?.length > 0 && (
                            <div className="mt-4 space-y-2 text-sm text-slate-700">
                              <div>
                                {isManager ? "Моите апартаменти" : "Твоите апартаменти"}:{" "}
                                <b>{formatApartmentList(meta.owedApartments)}</b>
                              </div>
                              {meta.paidApartments.length > 0 && (
                                <div>
                                  Платени апартаменти: <b>{formatApartmentList(meta.paidApartments)}</b>
                                </div>
                              )}
                              {meta.outstandingApartments.length > 0 && (
                                <div>
                                  Оставащи апартаменти: <b>{formatApartmentList(meta.outstandingApartments)}</b> •{" "}
                                  <b>{(meta.outstandingApartments.length * amountNum).toFixed(2)} €</b>
                                </div>
                              )}

                              {meta.outstandingApartments.length > 0 && (
                                <button
                                  onClick={() => payWithStripe(payment._id)}
                                  className="rounded-2xl px-4 py-2.5 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
                                >
                                  Плати със Stripe
                                </button>
                              )}
                            </div>
                          )}

                          {isManager && (
                            <div className="mt-4">
                              <div className="text-xs text-slate-500">Записи в плащанията: {(payment.paidBy || []).length}</div>

                              {(payment.paidBy || []).length > 0 && (
                                <div className="mt-3 rounded-2xl border border-slate-200 overflow-hidden">
                                  {(payment.paidBy || []).map((entry, idx) => {
                                    const paidApartments = getPaidEntryApartments(entry);
                                    const u = entry.user || null;
                                    // При ръчно плащане няма user, затова показваме въведеното име.
                                    const name = u?.name || entry.payerName || "—";
                                    const methodLabel = entry.method === "stripe" ? "Stripe" : entry.method === "manual" ? "На ръка" : entry.method || "—";

                                    return (
                                      <div
                                        key={idx}
                                        className="flex items-start justify-between gap-4 border-b last:border-b-0 px-4 py-3 text-sm"
                                      >
                                        <div className="min-w-0">
                                          <div className="font-semibold text-slate-900 truncate">{name}</div>
                                          <div className="text-xs text-slate-500">
                                            Апартаменти: <b>{formatApartmentList(paidApartments)}</b> • Метод: <b>{methodLabel}</b>
                                          </div>
                                        </div>
                                        <div className="shrink-0 text-xs text-slate-500">{fmtDateTime(entry.paidAt)}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {filtered.length > shortList.length && (
                      <div className="pt-2">
                        <button
                          onClick={() => setShowCount((x) => Math.min((x || 0) + 50, 500))}
                          className="rounded-2xl px-4 py-2.5 text-sm font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 transition"
                        >
                          Покажи още
                        </button>
                        <div className="text-xs text-slate-500 mt-2">
                          Показваш {shortList.length} от {filtered.length} резултата.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <HelpCard title="Как работи плащането">
                <ul className="list-disc pl-5 mt-2 space-y-2">
                  <li>Ако имаш повече от един апартамент, системата смята колко апартамента още не са платени.</li>
                  <li>При Stripe плащаш само за оставащите апартаменти по това начисление.</li>
                  <li>След успех системата записва точно кои апартаменти са покрити.</li>
                </ul>
              </HelpCard>

              <HelpCard title="Обхват на начисление">
                <div className="text-sm text-slate-700 space-y-2">
                  <div>Общо начисление важи за всички апартаменти във входа.</div>
                  <div>Специфично начисление може да е за един или няколко апартамента.</div>
                  <div>Ако профилът ти има няколко апартамента, ще виждаш остатъка по всеки от тях.</div>
                </div>
              </HelpCard>

              <HelpCard title="Ако не се зарежда">
                Ако получиш съобщение, че входът не е активен, провери trial/абонамента в <b>Стая</b> или <b>Табло</b>.
              </HelpCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
