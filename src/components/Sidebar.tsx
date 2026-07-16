"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: "🏠" },
  { href: "/dashboard/attendance", label: "Attendance", icon: "🗓️" },
  { href: "/dashboard/departments", label: "Departments", icon: "🗂️" },
  { href: "/dashboard/tasks", label: "My Tasks", icon: "✅" },
  { href: "/dashboard/files", label: "Files", icon: "🗃️" },
  { href: "/dashboard/calendar", label: "Calendar", icon: "📅" },
  { href: "/dashboard/chat", label: "Chat", icon: "💬" },
  { href: "/dashboard/directory", label: "Directory", icon: "👥" },
];

export default function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const items = isAdmin
    ? [...NAV_ITEMS, { href: "/dashboard/admin", label: "Admin", icon: "⚙️" }]
    : NAV_ITEMS;

  return (
    <nav
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex h-full w-64 -translate-x-full shrink-0 flex-col",
        "border-r border-sky-100 bg-white px-3 py-6 transition-transform duration-200 ease-in-out",
        "peer-checked:translate-x-0",
        "lg:static lg:w-60 lg:translate-x-0"
      )}
    >
      <div className="mb-8 flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-sm font-semibold text-white">
            CA
          </div>
          <span className="font-semibold text-slate-800">Curhatin Aja</span>
        </div>
        <label
          htmlFor="sidebar-toggle"
          className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-sky-50 hover:text-sky-700 lg:hidden"
          aria-label="Close menu"
        >
          ✕
        </label>
      </div>

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {items.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sky-500 text-white"
                  : "text-slate-600 hover:bg-sky-50 hover:text-sky-700"
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
