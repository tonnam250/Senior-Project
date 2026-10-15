export function pageRange(n: { page_start: number; page_end: number }) {
    return n.page_start === n.page_end
        ? `หน้า ${n.page_start}`
        : `หน้า ${n.page_start}–${n.page_end}`;
}

export function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}