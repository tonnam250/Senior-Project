import type { Metadata } from "next";
import DocumentPage from "@/features/documents/DocumentPage";

export const metadata: Metadata = { title: "ผลสรุปเอกสาร" };

export default function Page() {
    return <DocumentPage />;
}