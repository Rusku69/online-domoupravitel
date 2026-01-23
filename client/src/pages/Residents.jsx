import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../store/auth";
import { PageHeader, HelpCard, ErrorBox, SuccessBox } from "../components/PageBits";
import SiteFooter from "../components/SiteFooter";

function Pill({ children, tone = "gray" }) {
  const map = {
    gray: "bg-slate-100 text-slate-700 border-slate-200",
    green: "bg-emerald-50 text-emerald-900 border-emerald-200",
    yellow: "bg-amber-50 text-amber-900 border-amber-200",
    red: "bg-rose-50 text-rose-900 border-rose-200",
    sky: "bg-slate-50 text-slate-700 border-slate-200",
    violet: "bg-violet-50 text-violet-900 border-violet-200",
  };
  return (
    <span className={`inline-flex text-xs px-2.5 py-1 rounded-full border ${map[tone] || map.gray}`}>
      {children}
    </span>
  );
}

export default function Residents() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";

  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [q, setQ] = useState(""); // search: name/email/apt
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      setMsg("");

      if (!user?.roomId) {
        setRoom(null);
        setMembers([]);
        return;
      }

      const res = await api.get(`/api/rooms/${user.roomId}/members`);
      setRoom(res.data?.room || null);
      setMembers(Array.isArray(res.data?.members) ? res.data.members : []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при зареждане");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.roomId, user?.role]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return members;

    return members.filter((m) => {
      const name = (m.name || "").toLowerCase();
      const email = (m.email || "").toLowerCase();
      const apt = String(m.apartment || "").toLowerCase();
      return name.includes(s) || email.includes(s) || apt.includes(s);
    });
  }, [members, q]);

  const approved = useMemo(() => filtered.filter((m) => m.status === "approved"), [filtered]);
  const pending = useMemo(() => filtered.filter((m) => m.status === "pending"), [filtered]);

  const toggleTenant = async (memberId, current) => {
    try {
      setErr("");
      setMsg("");
      await api.patch(`/api/rooms/${user.roomId}/members/${memberId}/tag`, {
        tenantTag: !current,
      });
      setMsg("Етикетът е обновен.");
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при обновяване");
    }
  };

  const kick = async (memberId, name) => {
    const ok = confirm(`Сигурен ли си, че искаш да премахнеш: ${name || "този потребител"} ?`);
    if (!ok) return;

    try {
      setErr("");
      setMsg("");
      await api.delete(`/api/rooms/${user.roomId}/members/${memberId}`);
      setMsg("Премахнат.");
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при премахване");
    }
  };

  if (!user) return null;

  if (!isManager) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <div className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="font-black text-slate-900">403</div>
              <div className="text-sm text-slate-600 mt-2">
                Нямаш достъп до списъка с живущи. Тази секция е достъпна само за домоуправител.
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
            title="Живущи"
            subtitle={
              <>
                Тук домоуправителят вижда всички членове на стаята (входа): имена, апартаменти, статус и бележки.
                <br />
                Етикетът <b>„Под наем“</b> се вижда само тук — живущите не го виждат никъде другаде.
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-black text-slate-900">
                      Стая: {room?.building || "—"} • Вход {room?.entrance || "—"}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      Код: <b className="text-slate-900">{room?.code || "—"}</b>
                    </div>
                  </div>

                  <div className="min-w-[260px]">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Търсене (име, имейл, апартамент)
                    </label>
                    <input
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="пример: 12 или ivan@..."
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Pill tone="green">Одобрени: {approved.length}</Pill>
                  <Pill tone="yellow">Чакащи: {pending.length}</Pill>
                  <Pill tone="gray">Общо: {filtered.length}</Pill>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  Подсказка: списъкът е по стая. Одобрението на чакащи профили е в “Стая”, тук е прегледът и поддръжката.
                </div>
              </div>

              {/* Approved */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="font-black text-slate-900">Одобрени</div>
                <div className="text-sm text-slate-600 mt-2">
                  Тези хора имат достъп до секциите на входа. Можеш да отбелязваш „Под наем“ и при нужда да премахнеш човек.
                </div>

                {loading ? (
                  <div className="text-sm text-slate-500 mt-4">Зареждане...</div>
                ) : approved.length === 0 ? (
                  <div className="text-sm text-slate-500 mt-4">Няма одобрени.</div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {approved.map((m) => (
                      <div key={m._id} className="rounded-3xl border border-slate-200 p-5 bg-white shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-black text-slate-900">{m.name || "—"}</div>
                              {m.tenantTag && <Pill tone="violet">Под наем</Pill>}
                              <Pill tone="green">approved</Pill>
                            </div>

                            <div className="text-sm text-slate-600 mt-1">
                              {m.email || "—"} {m.phone ? `• ${m.phone}` : ""}
                            </div>

                            <div className="text-xs text-slate-500 mt-2">
                              Апартамент: <b>{m.apartment || "—"}</b>
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-col gap-2">
                            <button
                              onClick={() => toggleTenant(m._id, !!m.tenantTag)}
                              className={`rounded-2xl px-3 py-2 text-xs font-semibold border transition ${
                                m.tenantTag
                                  ? "border-violet-300 text-violet-900 hover:bg-violet-50"
                                  : "border-slate-300 text-slate-900 hover:bg-slate-100"
                              }`}
                            >
                              {m.tenantTag ? "Махни „Под наем“" : "Маркирай „Под наем“"}
                            </button>

                            <button
                              onClick={() => kick(m._id, m.name)}
                              className="rounded-2xl px-3 py-2 text-xs font-semibold border border-rose-300 text-rose-900 hover:bg-rose-50 transition"
                            >
                              Премахни
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="font-black text-slate-900">Чакащи</div>
                <div className="text-sm text-slate-600 mt-2">
                  Тези хора са в процес на присъединяване. Одобряването е в секцията „Стая“, а тук само ги виждаш за контекст.
                </div>

                {loading ? (
                  <div className="text-sm text-slate-500 mt-4">Зареждане...</div>
                ) : pending.length === 0 ? (
                  <div className="text-sm text-slate-500 mt-4">Няма чакащи.</div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {pending.map((m) => (
                      <div key={m._id} className="rounded-3xl border border-slate-200 p-5 bg-white shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-black text-slate-900">{m.name || "—"}</div>
                              <Pill tone="yellow">pending</Pill>
                            </div>

                            <div className="text-sm text-slate-600 mt-1">
                              {m.email || "—"} {m.phone ? `• ${m.phone}` : ""}
                            </div>

                            <div className="text-xs text-slate-500 mt-2">
                              Апартамент: <b>{m.apartment || "—"}</b>
                            </div>
                          </div>

                          <div className="shrink-0">
                            <button
                              onClick={() => kick(m._id, m.name)}
                              className="rounded-2xl px-3 py-2 text-xs font-semibold border border-rose-300 text-rose-900 hover:bg-rose-50 transition"
                            >
                              Премахни заявка
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ASIDE HELP */}
            <div className="space-y-4">
              <HelpCard title="Етикет „Под наем“">
                <div className="text-sm text-slate-700 mt-2">
                  Ползва се само за вътрешно маркиране.
                  <br />
                  Живущите не виждат този етикет в табло/плащания/сигнали — само тук.
                </div>
              </HelpCard>

              <HelpCard title="Какво прави „Премахни“">
                <div className="text-sm text-slate-700 mt-2">
                  Премахва човека от стаята и занулява room данните в профила му. Ако пак иска да влезе — ще трябва отново да се присъедини с кода.
                </div>
              </HelpCard>

              <HelpCard title="Практическа бележка">
                <div className="text-sm text-slate-700 mt-2">
                  Добра практика е да поддържаш списъка актуален. Ако има стари профили или дублирани акаунти, премахването
                  помага за по-точни справки и по-малко объркване при комуникация.
                </div>
              </HelpCard>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Поддръжка</div>
                <div className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Ако има профил, който не трябва да има достъп (сменен собственик, наемател, стар акаунт), премахването от стаята държи данните чисти.
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  Одобряване/отказване на заявки се управлява в “Стая”. Тук е контролът върху членството след това.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
}
