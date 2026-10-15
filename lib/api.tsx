export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type DocumentInfo = {
    document_id: number;
    filename: string;
    status: string;
    page_count: number | null;
    chunk_count: number;
};

export type Summary = {
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

export type SummaryResponse = {
    document_id: number;
    status: string;
    levels: Record<string, number>;
    final_summary: Summary | null;
    summaries: Summary[];
};

export type Chunk = {
    id: number;
    chunk_index: number;
    text: string;
    page_start: number;
    page_end: number;
};

export type SearchResult = {
    chunk_id: number;
    document_id: number;
    filename: string;
    page_start: number;
    page_end: number;
    text: string;
    similarity: number;
};

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

export function describeError(err: unknown): string {
    if (err instanceof ApiError) return err.message;
    if (err instanceof TypeError) {
        return `เชื่อมต่อ backend ไม่ได้ ตรวจว่า uvicorn รันอยู่ที่ ${API}`;
    }
    if (err instanceof Error) return err.message;
    return "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
}

async function getJson<T>(path: string, label: string): Promise<T> {
    const res = await fetch(`${API}${path}`);
    if (!res.ok) throw new ApiError(`${label} (รหัส ${res.status})`, res.status);
    return (await res.json()) as T;
}

export async function startProcess(
    file: File
): Promise<{ document_id: number; page_count: number }> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API}/process`, { method: "POST", body: form });
    if (!res.ok) {
        throw new ApiError(
            `อัปโหลดไม่สำเร็จ (รหัส ${res.status}) ดูสาเหตุใน terminal ที่รัน uvicorn`,
            res.status
        );
    }
    return res.json();
}

export const getStatus = (id: number) =>
    getJson<DocumentInfo>(`/documents/${id}/status`, "ดึงสถานะไม่สำเร็จ");

export const getSummary = (id: number) =>
    getJson<SummaryResponse>(`/documents/${id}/summary`, "ดึงสรุปไม่สำเร็จ");

export const getChunk = (docId: number, chunkId: number) =>
    getJson<Chunk>(`/documents/${docId}/chunks/${chunkId}`, "ดึงต้นฉบับไม่สำเร็จ");

export async function searchChunks(q: string, limit = 5): Promise<SearchResult[]> {
    const data = await getJson<{ results: SearchResult[] }>(
        `/search?q=${encodeURIComponent(q)}&limit=${limit}`,
        "ค้นหาไม่สำเร็จ"
    );
    return data.results;
}