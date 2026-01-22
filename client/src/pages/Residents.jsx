import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../store/auth";
import { PageHeader, HelpCard, ErrorBox, SuccessBox } from "../components/PageBits";

function Pill({ children, tone = "gray" }) {
  const map = {
    gray: "bg-slate-100 text-slate-700",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-700",
    red: "bg-red-100 text-red-700",
    sky: "bg-sky-100 text-sky-700",
    violet: "bg-violet-100 text-violet-700",
  };
  return (
    <span className={`inline-flex text-xs px-2 py-1 rounded-full ${map[tone] || map.gray}`}>
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
  if (!isManager) return <div className="p-6">403</div>;

  return (
    <div className="min-h-screen bg-sky-50 p-6">
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-black text-slate-900">
                    Стая: {room?.building || "—"} • Вход {room?.entrance || "—"}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    Код: <b className="text-sky-700">{room?.code || "—"}</b>
                  </div>
                </div>

                <div className="min-w-[260px]">
                  <label className="block text-xs text-slate-500 mb-1">Търсене (име, имейл, апартамент)</label>
                  <input
                    className="w-full border rounded-2xl px-4 py-3"
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
            </div>

            {/* Approved */}
            <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-soft">
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
                    <div key={m._id} className="rounded-3xl border border-slate-200 p-5">
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
                            className={`rounded-2xl px-3 py-2 text-xs font-semibold border ${
                              m.tenantTag
                                ? "border-violet-200 text-violet-700 hover:bg-violet-50"
                                : "border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            {m.tenantTag ? "Махни „Под наем“" : "Маркирай „Под наем“"}
                          </button>

                          <button
                            onClick={() => kick(m._id, m.name)}
                            className="rounded-2xl px-3 py-2 text-xs font-semibold border border-red-200 text-red-700 hover:bg-red-50"
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
            <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-soft">
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
                    <div key={m._id} className="rounded-3xl border border-slate-200 p-5">
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
                            className="rounded-2xl px-3 py-2 text-xs font-semibold border border-red-200 text-red-700 hover:bg-red-50"
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
                Премахва човека от стаята и занулява room данните в профила му.
                Ако пак иска да влезе — ще трябва отново да се присъедини с кода.
              </div>
            </HelpCard>

            <HelpCard title="Практическа бележка">
              <div className="text-sm text-slate-700 mt-2">
                Добра практика е да поддържаш списъка актуален. Ако има стари профили или дублирани акаунти, премахването
                помага за по-точни справки и по-малко объркване при комуникация.
              </div>
            </HelpCard>
          </div>
        </div>
      </div>
    </div>
  );
}
