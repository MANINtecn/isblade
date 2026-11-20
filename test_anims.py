with open('prototipo/build_darkelf_heroes.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(220, min(260, len(lines))):
    print(f'{i+1}: {lines[i]}', end='')
