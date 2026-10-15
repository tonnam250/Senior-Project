"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApiError, describeError, getStatus, getSummary } from "@/lib/api";
import type { DocumentInfo, Summary, SummaryResponse } from "@/lib/api";
import { focusRing, pillButton } from "@/components/ui";
import Progress from "@/components/progress";
import TreeNode from "@/components/treenode";

export default function DocumentPage() {
    const params = useParams<{ id: string }>();
    const docId = Number(params?.id);
    const valid = Number.isInteger(docId) && docId > 0;

    const [info, setInfo] = useState<DocumentInfo | null>(null);
    const [result, setResult] = useState<SummaryResponse | null>(null);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    // ถามสถานะทุก 2 วินาที จนเสร็จหรือล้มเหลว
    useEffect(() => {
        if (!valid) return;
        let stopped = false;
        let timer: ReturnType<typeof setTimeout>;

        setInfo(null);
        setResult(null);
        setError("");

        async function tick() {
            try {
                const data = await getStatus(docId);
                if (stopped) return;
                setInfo(data);

                if (data.status === "done") {
                    const r = await getSummary(docId);
                    if (!stopped) setResult(r);
                    return;
                }
                if (data.status === "failed") {
                    setError(
                        "การประมวลผลล้มเหลว ดูสาเหตุใน terminal ที่รัน uvicorn ไฟล์สแกนที่ไม่มีข้อความจะล้มเหลวในขั้นแบ่งเอกสาร"
                    );
                    return;
                }
                timer = setTimeout(tick, 2000);
            } catch (err) {
                if (stopped) return;
                setError(
                    err instanceof ApiError && err.status === 404
                        ? `ไม่พบเอกสารหมายเลข ${docId} อาจถูกลบไปแล้ว ลองอัปโหลดไฟล์ใหม่`
                        : describeError(err)
                );
            }
        }

        tick();
        return () => {
            stopped = true;
            clearTimeout(timer);
        };
    }, [docId, valid]);

    const childrenOf = useMemo(() => {
        const map = new Map<number, Summary[]>();
        for (const s of result?.summaries ?? []) {
            if (s.parent_id !== null) {
                map.set(s.parent_id, [...(map.get(s.parent_id) ?? []), s]);
            }
        }
        return map;
    }, [result]);

    const totalSeconds = useMemo(
        () => (result?.summaries ?? []).reduce((sum, s) => sum + (s.elapsed_ms ?? 0), 0) / 1000,
        [result]
    );

    async function handleCopy() {
        if (!result?.final_summary) return;
        try {
            await navigator.clipboard.writeText(result.final_summary.text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setError("คัดลอกไม่ได้ ลองเลือกข้อความแล้วคัดลอกเอง");
        }
    }

    if (!valid) {
        return (
            <div role="alert" className="rounded-xl border border-black border-l-4 bg-white p-4 text-sm">
                <p className="font-medium">หมายเลขเอกสารไม่ถูกต้อง</p>
                <Link href="/summarize" className="mt-2 inline-block underline">
                    ไปที่หน้าอัปโหลด
                </Link>
            </div>
        );
    }

    return (
        <>
            <Link href="/summarize" className={`${pillButton} ${focusRing} inline-block`}>
                อัปโหลดไฟล์อื่น
            </Link>

            {error && (
                <div
                    role="alert"
                    className="mt-6 rounded-xl border border-black border-l-4 bg-white p-4 text-sm leading-6"
                >
                    <p className="font-medium">เกิดข้อผิดพลาด</p>
                    <p className="mt-1 text-black/70">{error}</p>
                </div>
            )}

            {info && (
                <section className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
                    <p className="truncate font-medium">{info.filename}</p>
                    <div className="mt-5">
                        <Progress status={info.status} />
                    </div>

                    <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-black/10 pt-5 sm:grid-cols-4">
                        <div>
                            <dd className="text-xl font-medium tabular-nums">{info.page_count ?? "-"}</dd>
                            <dt className="text-sm text-black/60">หน้า</dt>
                        </div>
                        <div>
                            <dd className="text-xl font-medium tabular-nums">{info.chunk_count}</dd>
                            <dt className="text-sm text-black/60">ส่วนที่แบ่ง</dt>
                        </div>
                        {result && (
                            <>
                                <div>
                                    <dd className="text-xl font-medium tabular-nums">
                                        {Object.keys(result.levels).length}
                                    </dd>
                                    <dt className="text-sm text-black/60">ระดับการสรุป</dt>
                                </div>
                                <div>
                                    <dd className="text-xl font-medium tabular-nums">{totalSeconds.toFixed(0)}</dd>
                                    <dt className="text-sm text-black/60">วินาทีที่ใช้สรุป</dt>
                                </div>
                            </>
                        )}
                    </dl>
                </section>
            )}

            {result?.final_summary && (
                <section className="mt-6 rounded-2xl border border-black/10 bg-white p-6 sm:p-8">
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-xl font-semibold tracking-tight">สรุปทั้งเอกสาร</h2>
                        <button type="button" onClick={handleCopy} className={`${pillButton} ${focusRing}`}>
                            {copied ? "คัดลอกแล้ว" : "คัดลอกสรุป"}
                        </button>
                    </div>
                    <div className="mt-5">
                        <TreeNode
                            node={result.final_summary}
                            childrenOf={childrenOf}
                            depth={0}
                            docId={result.document_id}
                        />
                    </div>
                </section>
            )}
        </>
    );
}