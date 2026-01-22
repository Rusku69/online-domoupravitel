export function PageHeader({ title, subtitle, right }) {
  return (
    <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{title}</h1>
          {subtitle && <div className="text-sm text-slate-600 mt-2 leading-relaxed">{subtitle}</div>}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </div>
  );
}

export function HelpCard({ title, children }) {
  return (
    <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-soft">
      <div className="font-black text-slate-900">{title}</div>
      <div className="text-sm text-slate-600 mt-2 leading-relaxed">{children}</div>
    </div>
  );
}

export function ErrorBox({ children }) {
  if (!children) return null;
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
      {children}
    </div>
  );
}

export function SuccessBox({ children }) {
  if (!children) return null;
  return (
    <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">
      {children}
    </div>
  );
}
