"use client";

import { usePathname } from "next/navigation";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-gradient-to-b from-sky-100 via-sky-50 to-white px-4 py-10">
      <div className="flex w-full max-w-5xl items-center justify-center gap-4">
        {isLoginPage && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/mascot-teli.png"
            alt=""
            aria-hidden="true"
            className="hidden max-h-[420px] w-auto shrink-0 object-contain lg:block"
          />
        )}

        <div className="w-full max-w-md shrink-0">
          <div className="mb-8 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Curhatin Aja"
              className="mx-auto mb-3 h-14 w-auto object-contain"
            />
            <h1 className="text-xl font-semibold text-slate-800">Curhatin Aja</h1>
            <p className="text-sm text-slate-500">Team workspace</p>
          </div>
          <div className="card p-6 sm:p-8">{children}</div>
        </div>

        {isLoginPage && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/mascot-muli.png"
            alt=""
            aria-hidden="true"
            className="hidden max-h-[420px] w-auto shrink-0 object-contain lg:block"
          />
        )}
      </div>
    </div>
  );
}
