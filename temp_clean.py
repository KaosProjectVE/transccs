import unicodedata
import pathlib
path = pathlib.Path('src/App.jsx')
text = path.read_text(encoding='utf-8')
text = unicodedata.normalize('NFKD', text)
filtered = ''.join(ch for ch in text if not unicodedata.combining(ch))
filtered = filtered.replace('\u201c', '"').replace('\u201d', '"').replace('\u2019', "'")
filtered = filtered.replace('\u2013', '-').replace('\u2014', '-').replace('\u2026', '...')
filtered = ''.join(ch if ord(ch) < 128 else '?' for ch in filtered)
path.write_text(filtered, encoding='utf-8')
