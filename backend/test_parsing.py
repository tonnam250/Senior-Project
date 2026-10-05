from parsing.parse import parse_pdf

path_pdf = r"C:\Users\User\OneDrive\Desktop\Senior Project\source\14.pdf"

pages = parse_pdf(path_pdf)

print("จำนวนหน้า:", len(pages))
print("หน้าแรก:", pages[0])