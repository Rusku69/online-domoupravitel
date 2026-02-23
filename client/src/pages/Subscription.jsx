import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../store/auth";
import { PageHeader, HelpCard, ErrorBox, SuccessBox } from "../components/PageBits";

export default function Subscription() {
  const { user, fetchUser } = useAuth();

  const isManager = user?.role === "manager";
  const isAdmin = user?.role === "admin";

  const [months, setMonths] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [apartmentsCount, setApartmentsCount] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const pricePerApartmentEur = 1;
  const canRenew = Number.isInteger(apartmentsCount) && apartmentsCount > 0;
  const totalAmountEur = useMemo(() => {
    if (!canRenew) return null;
    return apartmentsCount * pricePerApartmentEur * months;
  }, [canRenew, apartmentsCount, months]);

  useEffect(() => {
    let cancelled = false;

    const loadRoom = async () => {
      if (!user?.roomId) {
        setApartmentsCount(null);
        return;
      }

      try {
        setLoadingRoom(true);
        const res = await api.get(`/api/rooms/${user.roomId}`);
        const n = Number(res.data?.apartmentsCount);
        if (!cancelled) {
          setApartmentsCount(Number.isInteger(n) && n > 0 ? n : null);
        }
      } catch {
        if (!cancelled) setApartmentsCount(null);
      } finally {
        if (!cancelled) setLoadingRoom(false);
      }
    };

    loadRoom();
    return () => {
      cancelled = true;
    };
  }, [user?.roomId]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const paid = params.get("paid") === "1";
      const canceled = params.get("canceled") === "1";

      if (paid) {
        setErr("");
        setMsg("Плащането е успешно. Статусът на абонамента се обновява автоматично.");
        fetchUser();
      } else if (canceled) {
        setMsg("");
        setErr("Плащането беше отказано/прекъснато.");
      }

      if (paid || canceled) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch {
      // ignore URL parsing issues
    }
  }, [fetchUser]);

  const renew = async () => {
    try {
      setErr("");
      setMsg("");

      if (!canRenew) {
        setErr("Липсва валиден брой апартаменти за тази стая.");
        return;
      }

      setLoading(true);

      const res = await api.post("/api/subscription/renew", { months });
      const url = res?.data?.url;
      if (!url) {
        setErr("Липсва Stripe checkout URL.");
        return;
      }

      window.location.href = url;
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при подновяване");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (!isManager && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <div className="flex-1 p-6">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="font-black text-slate-900">Достъп ограничен</div>
              <div className="text-sm text-slate-600 mt-2">
                Подновяването на абонамент е действие на домоуправителя (или администратор).
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                Ако си живущ, можеш да следиш статуса на входа и начисленията от таблото.
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
            title="Подновяване на абонамент"
            subtitle={
              <>
                Тук домоуправителят подновява достъпа на входа.
                <br />
                Сумата е: <b>1 € x брой апартаменти x месеци</b>.
              </>
            }
          />

          <ErrorBox>{err}</ErrorBox>
          <SuccessBox>{msg}</SuccessBox>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="font-black text-slate-900">Период</div>
                <div className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Избери период за подновяване. След това ще бъдеш пренасочен към Stripe Checkout за плащане с карта.
                  При успешно плащане системата удължава срока на активност за стаята и отключва модулите.
                </div>

                <div className="mt-5">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Период</label>
                  <select
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    {[1, 2, 3, 6, 12].map((n) => (
                      <option key={n} value={n}>
                        {n} месец(а)
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 text-xs text-slate-500">
                    Препоръка: за реална употреба обикновено се използва 3 или 12 месеца.
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div>
                    Апартаменти: <b>{loadingRoom ? "..." : canRenew ? apartmentsCount : "не е зададено"}</b>
                  </div>
                  <div className="mt-1">
                    Цена: <b>{pricePerApartmentEur.toFixed(2)} €</b> на апартамент / месец
                  </div>
                  <div className="mt-1">
                    Общо: <b>{totalAmountEur === null ? "—" : `${totalAmountEur.toFixed(2)} €`}</b>
                  </div>
                </div>

                {!canRenew && !loadingRoom && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                    Не може да се поднови, докато в стаята няма зададен валиден брой апартаменти.
                  </div>
                )}

                <button
                  onClick={renew}
                  disabled={loading || loadingRoom || !canRenew}
                  className="mt-5 w-full rounded-2xl px-4 py-3.5 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 transition shadow-sm"
                >
                  {loading ? "Пренасочване..." : "Продължи към Stripe плащане"}
                </button>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  След успешно плащане през Stripe статусът на входа се обновява автоматично чрез webhook.
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <HelpCard title="Какво прави това">
                Удължава <b>subscriptionExpires</b> на стаята (Room). След това заключените секции се отключват.
              </HelpCard>

              <HelpCard title="Плащания">
                Крайната сума се смята автоматично по броя апартаменти и периода, след което плащането минава през Stripe Checkout.
              </HelpCard>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Бележка</div>
                <div className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Ако входът е в тест период, този екран е полезен за показване на процеса по преминаване към активен абонамент
                  и за демонстрация на ограниченията при неактивен достъп.
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Прозрачност</div>
            <div className="mt-2 text-sm text-slate-600 leading-relaxed">
              Абонаментът е на ниво „вход“ (стая). Това означава, че всички живущи във входа работят с една и съща активност,
              история и справки. Управлението се извършва от домоуправителя.
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
}
