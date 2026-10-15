"use client";

import { useState } from "react";
import type { DragEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { describeError, startProcess } from "@/lib/api";
import { formatSize } from "@/lib/format";
import { focusRing, primaryButton } from "@/components/ui";

export default function SummarizePage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");

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
        setUploading(true);
        try {
            const data = await startProcess(file);
            router.push(`/documents/${data.document_id}`);
        } catch (err) {
            setError(describeError(err));
            setUploading(false);
        }
    }

    return (
        <>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight">อัปโหลดเอกสาร</h1>
            <p className="mt-3 max-w-xl leading-7 text-black/70">
                เลือกไฟล์ PDF แล้วระบบจะอ่าน แบ่งส่วน และสรุปทีละระดับ ใช้เวลาตามความยาวของเอกสาร
            </p>

            <form
                onSubmit={handleSubmit}
                className="mt-8 rounded-2xl border border-black/10 bg-white p-3"
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
                        disabled={!file || uploading}
                        className={`w-full sm:w-auto ${primaryButton} ${focusRing}`}
                    >
                        {uploading ? "กำลังอัปโหลด" : "สรุปเอกสาร"}
                    </button>
                </div>
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
        </>
    );
}