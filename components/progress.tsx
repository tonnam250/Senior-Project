const STEPS = [
    { key: "parsed", label: "อ่านไฟล์ PDF เสร็จแล้ว" },
    { key: "chunking", label: "กำลังแบ่งเอกสารเป็นส่วนย่อย" },
    { key: "embedding", label: "กำลังสร้าง embedding" },
    { key: "summarizing", label: "กำลังสรุปทีละระดับ" },
    { key: "done", label: "สรุปเสร็จแล้ว" },
];

export default function Progress({ status }: { status: string }) {
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