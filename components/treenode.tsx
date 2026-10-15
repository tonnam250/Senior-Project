"use client";

import { useState } from "react";
import { describeError, getChunk } from "@/lib/api";
import type { Chunk, Summary } from "@/lib/api";
import { serif } from "@/lib/fonts";
import { pageRange } from "@/lib/format";
import { focusRing, pillButton } from "@/components/ui";

export default function TreeNode({
    node,
    childrenOf,
    depth,
    docId,
}: {
    node: Summary;
    childrenOf: Map<number, Summary[]>;
    depth: number;
    docId: number;
}) {
    const [open, setOpen] = useState(false);
    const [showSource, setShowSource] = useState(false);
    const [chunk, setChunk] = useState<Chunk | null>(null);
    const [chunkLoading, setChunkLoading] = useState(false);
    const [chunkError, setChunkError] = useState("");

    const kids = childrenOf.get(node.id) ?? [];
    const isRoot = depth === 0;
    const hasSource = node.chunk_id !== null;

    async function toggleSource() {
        if (showSource) {
            setShowSource(false);
            return;
        }
        setShowSource(true);
        if (chunk || node.chunk_id === null) return; // เคยโหลดแล้วไม่ต้องโหลดซ้ำ
        setChunkLoading(true);
        setChunkError("");
        try {
            setChunk(await getChunk(docId, node.chunk_id));
        } catch (err) {
            setChunkError(describeError(err));
        } finally {
            setChunkLoading(false);
        }
    }

    return (
        <div className={isRoot ? "" : "mt-6 border-l border-black/15 pl-5"}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-black/60">
                <span className="rounded-full border border-black/25 px-3 py-0.5 text-black">
                    {pageRange(node)}
                </span>
                <span>ระดับ {node.level}</span>
                {node.elapsed_ms !== null && (
                    <span className="tabular-nums">{(node.elapsed_ms / 1000).toFixed(1)} วินาที</span>
                )}
            </div>

            <div className={showSource ? "mt-4 grid gap-5 md:grid-cols-2" : "mt-4"}>
                <p
                    className={`${serif.className} whitespace-pre-wrap text-[1.0625rem] leading-8 ${isRoot ? "text-black" : "text-black/80"
                        }`}
                >
                    {node.text}
                </p>

                {showSource && (
                    <aside
                        aria-label="ข้อความต้นฉบับ"
                        className="rounded-xl border border-black/10 bg-[#F1EADB]/50 p-4"
                    >
                        <div className="flex items-center gap-3 text-sm">
                            <span className="font-medium">ต้นฉบับ</span>
                            <span className="rounded-full border border-black/25 px-3 py-0.5">
                                {pageRange(chunk ?? node)}
                            </span>
                        </div>
                        {chunkLoading && <p className="mt-3 text-sm text-black/60">กำลังโหลดต้นฉบับ</p>}
                        {chunkError && (
                            <p role="alert" className="mt-3 text-sm text-black/70">
                                {chunkError}
                            </p>
                        )}
                        {chunk && (
                            <div className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap break-words pr-2 text-sm leading-7 text-black/80">
                                {chunk.text}
                            </div>
                        )}
                    </aside>
                )}
            </div>

            {(hasSource || kids.length > 0) && (
                <div className="mt-5 flex flex-wrap gap-2">
                    {hasSource && (
                        <button
                            type="button"
                            onClick={toggleSource}
                            aria-expanded={showSource}
                            className={`${pillButton} ${focusRing} ${showSource ? "bg-black text-white" : ""}`}
                        >
                            {showSource ? "ซ่อนต้นฉบับ" : "ดูต้นฉบับ"}
                        </button>
                    )}
                    {kids.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setOpen(!open)}
                            aria-expanded={open}
                            className={`${pillButton} ${focusRing}`}
                        >
                            {open ? "ซ่อนสรุปย่อย" : `ดูสรุปย่อย ${kids.length} ส่วน`}
                        </button>
                    )}
                </div>
            )}

            {open &&
                kids.map((k) => (
                    <TreeNode key={k.id} node={k} childrenOf={childrenOf} depth={depth + 1} docId={docId} />
                ))}
        </div>
    );
}