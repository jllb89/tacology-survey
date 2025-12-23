"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type NavLink = {
  label: string;
  href: string;
  icon: keyof typeof icons;
};

const icons = {
  home: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 9.5v10h12v-10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  responses: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M7 7h10M7 12h6M5 4h14a1 1 0 0 1 1 1v11.5a.5.5 0 0 1-.8.4L15 13.5H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  customers: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="9" cy="9" r="3" />
      <circle cx="17" cy="9" r="3" />
      <path d="M4 19.5c.6-2.1 2.6-3.5 5-3.5s4.4 1.4 5 3.5" strokeLinecap="round" />
      <path d="M13.5 16a5 5 0 0 1 6.5 3.5" strokeLinecap="round" />
    </svg>
  ),
  survey: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h3" strokeLinecap="round" />
    </svg>
  ),
};

export function AdminNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <div className="flex flex-1 flex-col">
      <nav className="space-y-1">
        {links.map((link) => {
          const active = link.href === "/admin"
            ? pathname === "/admin"
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                active
                  ? "flex items-center gap-3 rounded-lg border border-[#EB5A95]/30 bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm"
                  : "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              }
              aria-current={active ? "page" : undefined}
            >
              <span className={active ? "text-[#EB5A95]" : "text-neutral-400"}>{icons[link.icon]}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          <span className="text-neutral-400">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15.5 8.5 19 12l-3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19 12H10" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13 5v-.5A1.5 1.5 0 0 0 11.5 3h-6A1.5 1.5 0 0 0 4 4.5v15A1.5 1.5 0 0 0 5.5 21h6A1.5 1.5 0 0 0 13 19.5V19" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
}
