"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { focusRing } from "@/components/ui";

const NAV = [
    { href: "/", label: "หน้าแรก", prefixes: [] as string[] },
    { href: "/summarize", label: "สรุปเอกสาร", prefixes: ["/summarize", "/documents"] },
    { href: "/search", label: "ค้นหา", prefixes: ["/search"] },
];

export default function SiteShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    return (
        <>
            <header className="border-b border-black/10">
                <nav
                    aria-label="เมนูหลัก"
                    className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8"
                >
                    <Link href="/" className={`rounded-full text-sm font-semibold ${focusRing}`}>
                        สรุปเอกสารยาว
                    </Link>
                    <ul className="flex gap-1 text-sm">
                        {NAV.map((item) => {
                            const active =
                                item.href === "/"
                                    ? pathname === "/"
                                    : item.prefixes.some((p) => pathname.startsWith(p));
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        aria-current={active ? "page" : undefined}
                                        className={`rounded-full px-4 py-1.5 transition-colors motion-reduce:transition-none ${focusRing} ${active ? "bg-black text-white" : "text-black/70 hover:text-black"
                                            }`}
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </header>
            <main className="mx-auto max-w-3xl px-5 pb-24 pt-12 sm:px-8 sm:pt-16">{children}</main>
        </>
    );
}