import math
from embedding.embedder import embed_texts

texts = [
    "การสรุปเอกสารยาวด้วยโมเดลภาษา",          
    "การย่อเนื้อหางานวิจัยโดยใช้ AI",          
    "สูตรทำต้มยำกุ้งน้ำข้น",                    
]
vecs = embed_texts(texts)
print("จำนวนเวกเตอร์:", len(vecs), "| มิติ:", len(vecs[0]))

def cos(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))

print("0 กับ 1 (ควรสูง):", round(cos(vecs[0], vecs[1]), 3))
print("0 กับ 2 (ควรต่ำกว่า):", round(cos(vecs[0], vecs[2]), 3))