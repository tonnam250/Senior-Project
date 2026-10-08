"use client";

import { useEffect, useMemo, useState } from "react";
import type { DragEvent, FormEvent } from "react";
import { IBM_Plex_Sans_Thai, Noto_Serif_Thai } from "next/font/google";

const sans = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});
const serif = Noto_Serif_Thai({
  subsets: ["thai", "latin"],
  display: "swap",
});

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Info = {
  document_id: number;
  filename: string;
  status: string;
  page_count: number | null;
  chunk_count: number;
};

type Summary = {
  id: number;
  level: number;
  node_index: number;
  text: string;
  page_start: number;
  page_end: number;
  parent_id: number | null;
  chunk_id: number | null;
  model: string;
  prompt_version: string;
  elapsed_ms: number | null;
};

type SummaryResponse = {
  document_id: number;
  status: string;
  levels: Record<string, number>;
  final_summary: Summary | null;
  summaries: Summary[];
};

type Chunk = {
  id: number;
  chunk_index: number;
  text: string;
  page_start: number;
  page_end: number;
};

const pillButton =
  "rounded-full border border-black/25 px-4 py-1.5 text-sm transition-colors hover:bg-black hover:text-white motion-reduce:transition-none";

const STEPS = [
  { key: "parsed", label: "อ่านไฟล์ PDF เสร็จแล้ว" },
  { key: "chunking", label: "กำลังแบ่งเอกสารเป็นส่วนย่อย" },
  { key: "embedding", label: "กำลังสร้าง embedding" },
  { key: "summarizing", label: "กำลังสรุปทีละระดับ" },
  { key: "done", label: "สรุปเสร็จแล้ว" },
];

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";

function pageRange(n: Summary) {
  return n.page_start === n.page_end
    ? `หน้า ${n.page_start}`
    : `หน้า ${n.page_start}–${n.page_end}`;
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Progress({ status }: { status: string }) {
  const current = STEPS.findIndex((s) => s.key === status);
  const isDone = status === "done";

  return (
    <div>
      <div
        className="flex gap-1.5"
        role="progressbar"
        aria-label="ความคืบหน้าการประมวลผล"
        aria-valuemin={0}
        aria-valuemax={STEPS.length}
        aria-valuenow={current + 1}
      >
        {STEPS.map((s, i) => {
          const filled = i <= current;
          const active = i === current && !isDone;
          return (
            <div
              key={s.key}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-500 motion-reduce:transition-none ${filled ? "bg-black" : "bg-black/10"
                } ${active ? "animate-pulse motion-reduce:animate-none" : ""}`}
            />
          );
        })}
      </div>
      <p className="mt-3 text-sm text-black/70" aria-live="polite">
        {current >= 0 ? STEPS[current].label : "กำลังเริ่มประมวลผล"}
      </p>
    </div>
  );
}

function TreeNode({
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
      const res = await fetch(`${API}/documents/${docId}/chunks/${node.chunk_id}`);
      if (!res.ok) throw new Error(`ดึงต้นฉบับไม่สำเร็จ (รหัส ${res.status})`);
      setChunk(await res.json());
    } catch (err) {
      setChunkError(
        err instanceof TypeError
          ? `เชื่อมต่อ backend ไม่ได้ ตรวจว่า uvicorn รันอยู่ที่ ${API}`
          : err instanceof Error
            ? err.message
            : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ"
      );
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
          <span className="tabular-nums">
            {(node.elapsed_ms / 1000).toFixed(1)} วินาที
          </span>
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
              className={`${pillButton} ${focusRing} ${showSource ? "bg-black text-white" : ""
                }`}
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
          <TreeNode
            key={k.id}
            node={k}
            childrenOf={childrenOf}
            depth={depth + 1}
            docId={docId}
          />
        ))}
    </div>
  );
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docId, setDocId] = useState<number | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [result, setResult] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function pickFile(f: File | null | undefined) {
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("ไฟล์ต้องเป็น PDF เลือกไฟล์นามสกุล .pdf แล้วลองอีกครั้ง");
      return;
    }
    setError("");
    setFile(f);
  }

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError("");
    setInfo(null);
    setResult(null);
    setDocId(null);
    setCopied(false);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API}/process`, { method: "POST", body: form });
      if (!res.ok) {
        throw new Error(
          `อัปโหลดไม่สำเร็จ (รหัส ${res.status}) ดูสาเหตุใน terminal ที่รัน uvicorn`
        );
      }
      const data = await res.json();
      setDocId(data.document_id);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? `เชื่อมต่อ backend ไม่ได้ ตรวจว่า uvicorn รันอยู่ที่ ${API}`
          : err instanceof Error
            ? err.message
            : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ"
      );
    } finally {
      setUploading(false);
    }
  }

  // ถามสถานะทุก 2 วินาที จนเสร็จหรือล้มเหลว
  useEffect(() => {
    if (docId === null) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      try {
        const res = await fetch(`${API}/documents/${docId}/status`);
        if (!res.ok) throw new Error(`ดึงสถานะไม่สำเร็จ (รหัส ${res.status})`);
        const data: Info = await res.json();
        if (stopped) return;
        setInfo(data);

        if (data.status === "done") {
          const r = await fetch(`${API}/documents/${docId}/summary`);
          if (!r.ok) throw new Error(`ดึงสรุปไม่สำเร็จ (รหัส ${r.status})`);
          if (!stopped) setResult(await r.json());
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
        if (!stopped) {
          setError(
            err instanceof TypeError
              ? `เชื่อมต่อ backend ไม่ได้ ตรวจว่า uvicorn รันอยู่ที่ ${API}`
              : err instanceof Error
                ? err.message
                : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ"
          );
        }
      }
    }

    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [docId]);

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
    () =>
      (result?.summaries ?? []).reduce((sum, s) => sum + (s.elapsed_ms ?? 0), 0) / 1000,
    [result]
  );

  const finished = info?.status === "done" || info?.status === "failed";
  const busy = uploading || (docId !== null && !finished && !error);

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

  return (
    <main className={`${sans.className} min-h-screen bg-[#F1EADB] text-black`}>
      <div className="mx-auto max-w-3xl px-5 pb-24 pt-14 sm:px-8 sm:pt-20">
        <header>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            สรุปเอกสารยาว พร้อมบอกว่ามาจากหน้าไหน
          </h1>
          <p className="mt-4 max-w-xl leading-7 text-black/70">
            ระบบประมวลผลบนเครื่องนี้ทั้งหมด ไม่ส่งไฟล์ไปบริการภายนอก
          </p>
        </header>

        {/* อัปโหลด */}
        <form
          onSubmit={handleSubmit}
          className="mt-10 rounded-2xl border border-black/10 bg-white p-3"
        >
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center transition-colors motion-reduce:transition-none focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-black ${dragging ? "border-black bg-[#F1EADB]/60" : "border-black/25 hover:border-black"
              }`}
          >
            <input
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            {file ? (
              <>
                <span className="max-w-full truncate font-medium">{file.name}</span>
                <span className="mt-1 text-sm text-black/60">
                  {formatSize(file.size)} คลิกเพื่อเลือกไฟล์อื่น
                </span>
              </>
            ) : (
              <>
                <span className="font-medium">ลากไฟล์ PDF มาวางที่นี่</span>
                <span className="mt-1 text-sm text-black/60">หรือคลิกเพื่อเลือกไฟล์</span>
              </>
            )}
          </label>

          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={!file || busy}
              className={`w-full rounded-full bg-black px-7 py-3 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30 motion-reduce:transition-none sm:w-auto ${focusRing}`}
            >
              {busy ? "กำลังประมวลผล" : "สรุปเอกสาร"}
            </button>
          </div>
        </form>

        {/* ข้อผิดพลาด */}
        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-black border-l-4 bg-white p-4 text-sm leading-6"
          >
            <p className="font-medium">เกิดข้อผิดพลาด</p>
            <p className="mt-1 text-black/70">{error}</p>
          </div>
        )}

        {/* สถานะ */}
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
                    <dd className="text-xl font-medium tabular-nums">
                      {totalSeconds.toFixed(0)}
                    </dd>
                    <dt className="text-sm text-black/60">วินาทีที่ใช้สรุป</dt>
                  </div>
                </>
              )}
            </dl>
          </section>
        )}

        {/* ผลสรุป */}
        {result?.final_summary && (
          <section className="mt-6 rounded-2xl border border-black/10 bg-white p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-tight">สรุปทั้งเอกสาร</h2>
              <button
                type="button"
                onClick={handleCopy}
                className={`rounded-full border border-black/25 px-4 py-1.5 text-sm transition-colors hover:bg-black hover:text-white motion-reduce:transition-none ${focusRing}`}
              >
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
      </div>
    </main>
  );
}