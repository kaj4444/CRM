# -*- coding: utf-8 -*-
with open('src/App.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Nahradím všechny přímé volání Anthropic API za proxy
old_url1 = "      const response = await fetch('https://api.anthropic.com/v1/messages', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify({\n          model: 'claude-sonnet-4-20250514',\n          max_tokens: 1000,\n          messages: [{\n            role: 'user',\n            content: `Připrav mi stručný přehled pro discovery call"

count = content.count("https://api.anthropic.com/v1/messages")
print(f"Pocet vyskytu API URL: {count}")

# Nahradím API URL za proxy endpoint
content = content.replace(
    "await fetch('https://api.anthropic.com/v1/messages', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },",
    "await fetch('/api/ai', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },"
)

count_after = content.count("https://api.anthropic.com/v1/messages")
print(f"Pocet vyskytu po nahrazeni: {count_after}")

with open('src/App.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Hotovo — radku: {len(content.splitlines())}, export: {'export default function App' in content}")
