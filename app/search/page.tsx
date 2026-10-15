import type { Metadata } from "next";
import SearchPage from "@/features/search/SearchPage";

export const metadata: Metadata = { title: "ค้นหาข้ามเอกสาร" };

export default function Page() {
    return <SearchPage />;
}