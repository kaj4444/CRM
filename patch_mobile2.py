# -*- coding: utf-8 -*-
with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Nahradím celou mobile sekci
old = """@media (max-width: 768px) {
  .sidebar { display: none; }
  .main { margin-left: 0; padding: 16px; }
  .metrics { grid-template-columns: repeat(2, 1fr); }
}"""

if old in css:
    css = css.replace(old, "/* mobile handled below */")
    print("OK - old mobile removed")

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("CSS saved")
