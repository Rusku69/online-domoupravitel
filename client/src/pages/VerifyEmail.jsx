import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../lib/api";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = params.get("token");
    const email = params.get("email");

    if (!token || !email) {
      setStatus("error");
      setMessage("Невалиден линк за потвърждение.");
      return;
    }

    api
      .post("/api/auth/verify-email", { token, email })
      .then((res) => {
        setStatus("success");
        setMessage(res.data.message || "Имейлът е потвърден.");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err?.response?.data?.message || "Грешка при потвърждение.");
      });
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-sky-50 p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-soft p-6 text-center">
        {status === "loading" && <p className="text-slate-600">⏳ Проверка...</p>}

        {status === "success" && (
          <>
            <h1 className="text-2xl font-bold text-green-700 mb-2">✅ Успешно</h1>
            <p className="text-slate-700 mb-4">{message}</p>
            <Link
              to="/login"
              className="inline-block px-5 py-2 rounded-xl bg-sky-600 text-white font-semibold hover:bg-sky-700"
            >
              Вход
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-2xl font-bold text-red-600 mb-2">❌ Грешка</h1>
            <p className="text-slate-700 mb-4">{message}</p>
            <Link to="/" className="text-sky-700 hover:underline">
              Начална страница
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
