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
  };
  return (
    <span className={`inline-flex text-xs px-2 py-1 rounded-full ${map[tone] || map.gray}`}>
      {children}
    </span>
  );
}

export default function Admin() {
  const { user } = useAuth();

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      setMsg("");
      const res = await api.get("/api/admin/manager-requests");
      setList(Array.isArray(res.data) ? res.data : []);
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

  const approve = async (id) => {
    try {
      setErr("");
      setMsg("");
      await api.post(`/api/admin/manager-requests/${id}/approve`);
      setMsg("Заявката е одобрена.");
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при одобряване");
    }
  };

  const reject = async (id) => {
    try {
      setErr("");
      setMsg("");
      await api.post(`/api/admin/manager-requests/${id}/reject`);
      setMsg("Заявката е отказана.");
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при отказ");
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;

    return list.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const phone = String(u.phone || "").toLowerCase();
      const city = String(u.managerRequestCity || "").toLowerCase();
      const building = String(u.managerRequestBuilding || "").toLowerCase();
      const entrance = String(u.managerRequestEntrance || "").toLowerCase();
      const apt = String(u.managerRequestApartment || "").toLowerCase();

      return (
        name.includes(s) ||
        email.includes(s) ||
        phone.includes(s) ||
        city.includes(s) ||
        building.includes(s) ||
        entrance.includes(s) ||
        apt.includes(s)
      );
    });
  }, [list, q]);

  if (!user) return null;
  if (user.role !== "admin") return <div className="p-6">403</div>;

  return (
    <div className="min-h-screen bg-sky-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <PageHeader
          title="Admin"
          subtitle={
            <>
              Тук се обработват заявки за домоуправител. Администраторът преглежда данните и одобрява или отказва.
              <br />
              При одобрение системата създава стая и назначава потребителя като домоуправител.
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
                  <div className="font-black text-slate-900">Заявки за домоуправител</div>
                  <div className="text-sm text-slate-600 mt-1">
                    Виждаш: име, телефон, имейл, град/блок/вход и апартамент (заявка).
                  </div>
                </div>

                <div className="min-w-[260px]">
                  <label className="block text-xs text-slate-500 mb-1">Търсене</label>
                  <input
                    className="w-full border rounded-2xl px-4 py-3"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="име, имейл, телефон, град, блок, вход..."
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Pill tone="gray">Общо: {list.length}</Pill>
                <Pill tone="sky">Показани: {filtered.length}</Pill>
              </div>
            </div>

            <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-soft">
              <div className="font-black text-slate-900">Списък</div>

              {loading ? (
                <p className="text-sm text-slate-500 mt-4">Зареждане...</p>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-slate-500 mt-4">Няма чакащи заявки.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {filtered.map((u) => (
                    <div
                      key={u._id}
                      className="border border-slate-200 rounded-3xl p-5 flex items-start justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="font-black text-slate-900">{u.name || "—"}</div>
                        <div className="text-sm text-slate-600 mt-1">
                          {u.email || "—"}
                          {u.phone ? ` • ${u.phone}` : ""}
                        </div>

                        <div className="text-sm text-slate-700 mt-3">
                          {u.managerRequestCity || "—"} • Блок {u.managerRequestBuilding || "—"} • Вход{" "}
                          {u.managerRequestEntrance || "—"} • Ап. {u.managerRequestApartment || "—"}
                        </div>

                        <div className="text-xs text-slate-500 mt-2">
                          Бележка: Домоуправителят трябва да е реален живущ (апартаментът в заявката помага за проверка).
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col gap-2">
                        <button
                          onClick={() => approve(u._id)}
                          className="rounded-2xl px-3 py-2 text-xs font-semibold bg-green-600 text-white hover:bg-green-700"
                        >
                          Одобри
                        </button>
                        <button
                          onClick={() => reject(u._id)}
                          className="rounded-2xl px-3 py-2 text-xs font-semibold border border-red-200 text-red-700 hover:bg-red-50"
                        >
                          Откажи
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={load}
                className="mt-4 rounded-2xl px-4 py-2 text-sm font-semibold border border-sky-200 text-sky-700 hover:bg-sky-50"
              >
                Обнови
              </button>
            </div>
          </div>

          {/* ASIDE */}
          <div className="space-y-4">
            <HelpCard title="Какво прави одобрението">
              <div className="text-sm text-slate-700 mt-2 space-y-2">
                <div>
                  При одобрение системата създава стая за конкретния вход и назначава потребителя като домоуправител.
                </div>
                <div>
                  След това живущите могат да се присъединят към стаята с код и да чакат одобрение от домоуправителя.
                </div>
              </div>
            </HelpCard>

            <HelpCard title="Добра практика">
              <div className="text-sm text-slate-700 mt-2 space-y-2">
                <div>
                  Провери дали заявката изглежда логична (град/блок/вход и апартамент).
                </div>
                <div>
                  Ако има телефон, той помага при верификация при нужда.
                </div>
              </div>
            </HelpCard>
          </div>
        </div>
      </div>
    </div>
  );
}
