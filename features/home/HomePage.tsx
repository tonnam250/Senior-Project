import Link from "next/link";
import { focusRing } from "@/components/ui";

    const ENTRIES = [
        {
            href: "/summarize",
            title: "สรุปเอกสาร",
            body: "อัปโหลด PDF แล้วรับสรุปหลายระดับ กางดูได้ว่าแต่ละส่วนมาจากหน้าไหนและต้นฉบับเป็นอย่างไร",
        },
        {
            href: "/search",
            title: "ค้นหาข้ามเอกสาร",
            body: "พิมพ์คำถามหรือหัวข้อ ระบบหาข้อความที่เกี่ยวข้องจากทุกไฟล์ พร้อมบอกหน้า",
        },
    ];

export default function HomePage() {
    return (
        <>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                สรุปเอกสารยาว พร้อมบอกว่ามาจากหน้าไหน
            </h1>
            <p className="mt-4 max-w-xl leading-7 text-black/70">
                ระบบประมวลผลบนเครื่องนี้ทั้งหมด ไม่ส่งไฟล์ไปบริการภายนอก
            </p>

            <ul className="mt-10 grid gap-3 sm:grid-cols-2">
                {ENTRIES.map((e) => (
                    <li key={e.href}>
                        <Link
                            href={e.href}
                            className={`block h-full rounded-2xl border border-black/10 bg-white p-6 transition-colors hover:border-black motion-reduce:transition-none ${focusRing}`}
                        >
                            <span className="text-lg font-semibold tracking-tight">{e.title}</span>
                            <span className="mt-2 block text-sm leading-6 text-black/70">{e.body}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </>
    );
}