import type { Metadata } from "next";
import SummarizePage from "@/features/summarize/SummarizePage";

export const metadata: Metadata = { title: "สรุปเอกสาร" };

export default function Page() {
    return <SummarizePage />;
}