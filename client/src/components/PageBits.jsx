export function PageHeader({ title, subtitle, right }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
          {subtitle ? (
            <div className="text-sm text-slate-600 mt-2 leading-relaxed">{subtitle}</div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </div>
  );
}

export function HelpCard({ title, children }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="font-black text-slate-900">{title}</div>
      <div className="text-sm text-slate-600 mt-2 leading-relaxed">{children}</div>
    </div>
  );
}

export function ErrorBox({ children }) {
  if (!children) return null;
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
      {children}
    </div>
  );
}

export function SuccessBox({ children }) {
  if (!children) return null;
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
      {children}
    </div>
  );
}
