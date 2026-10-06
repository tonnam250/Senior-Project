from parsing.parse import parse_pdf
from chunking.chunker import chunk_pages

pages = parse_pdf(r"C:\Users\User\OneDrive\Desktop\Senior Project\source\14.pdf")
chunks = chunk_pages(pages)

print("จำนวนหน้า:", len(pages), "| จำนวน chunk:", len(chunks))
for c in chunks[:5]:
    print(c["chunk_index"], f'หน้า {c["page_start"]}-{c["page_end"]}', len(c["text"]), "ตัวอักษร")

sizes = [len(c["text"]) for c in chunks]
print("เล็กสุด/ใหญ่สุด:", min(sizes), max(sizes))