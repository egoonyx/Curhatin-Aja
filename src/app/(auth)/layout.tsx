export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-100 via-sky-50 to-white px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-xl font-semibold text-white">
            CA
          </div>
          <h1 className="text-xl font-semibold text-slate-800">Curhatin Aja</h1>
          <p className="text-sm text-slate-500">Team workspace</p>
        </div>
        <div className="card p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
