"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { describeError, searchChunks } from "@/lib/api";
import type { SearchResult } from "@/lib/api";
import { pageRange } from "@/lib/format";
import { focusRing, pillButton, primaryButton } from "@/components/ui";

const SNIPPET = 280;

export default function SearchPage() {
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<SearchResult[] | null>(null);
    const [error, setError] = useState("");
    const [expanded, setExpanded] = useState<number | null>(null);

    async function handleSearch(e: FormEvent) {
        e.preventDefault();
        const query = q.trim();
        if (!query) return;
        setLoading(true);
        setError("");
        setExpanded(null);
        try {
            setResults(await searchChunks(query, 5));
        } catch (err) {
            setResults(null);
            setError(describeError(err));
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight">ค้นหาข้ามทุกเอกสาร</h1>
            <p className="mt-3 max-w-xl leading-7 text-black/70">
                พิมพ์คำถามหรือหัวข้อ ระบบจะหาข้อความที่เกี่ยวข้องจากทุกไฟล์ที่เคยอัปโหลด พร้อมบอกหน้า
            </p>

            <form onSubmit={handleSearch} className="mt-8 flex flex-col gap-2 sm:flex-row">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="เช่น เงื่อนไขการต่ออายุสัญญา"
                    aria-label="คำค้นหา"
                    className="min-w-0 flex-1 rounded-full border border-black/25 bg-white px-5 py-3 text-sm placeholder:text-black/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                />
                <button
                    type="submit"
                    disabled={loading || !q.trim()}
                    className={`${primaryButton} ${focusRing}`}
                >
                    {loading ? "กำลังค้นหา" : "ค้นหา"}
                </button>
            </form>

            {error && (
                <div
                    role="alert"
                    className="mt-6 rounded-xl border border-black border-l-4 bg-white p-4 text-sm leading-6"
                >
                    <p className="font-medium">เกิดข้อผิดพลาด</p>
                    <p className="mt-1 text-black/70">{error}</p>
                </div>
            )}

            {results && results.length === 0 && (
                <p className="mt-6 text-sm text-black/60">
                    ยังไม่พบข้อความที่เกี่ยวข้อง ลองอัปโหลดเอกสารเพิ่ม หรือเปลี่ยนคำค้นหา
                </p>
            )}

            {results && results.length > 0 && (
                <ul className="mt-6 space-y-3">
                    {results.map((r) => {
                        const open = expanded === r.chunk_id;
                        const long = r.text.length > SNIPPET;
                        const shown = open || !long ? r.text : `${r.text.slice(0, SNIPPET)}…`;
                        return (
                            <li key={r.chunk_id} className="rounded-xl border border-black/10 bg-white p-4">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                                    <span className="max-w-full truncate font-medium">{r.filename}</span>
                                    <span className="rounded-full border border-black/25 px-3 py-0.5">
                                        {pageRange(r)}
                                    </span>
                                    <span className="tabular-nums text-black/60">
                                        ความคล้าย {Math.round(r.similarity * 100)}%
                                    </span>
                                </div>
                                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-black/80">
                                    {shown}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {long && (
                                        <button
                                            type="button"
                                            onClick={() => setExpanded(open ? null : r.chunk_id)}
                                            aria-expanded={open}
                                            className={`${pillButton} ${focusRing}`}
                                        >
                                            {open ? "ย่อข้อความ" : "ดูข้อความเต็ม"}
                                        </button>
                                    )}
                                    <Link
                                        href={`/documents/${r.document_id}`}
                                        className={`${pillButton} ${focusRing}`}
                                    >
                                        เปิดสรุปของเอกสารนี้
                                    </Link>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </>
    );
}