# Run before each update (python3 tools/stamp.py). Gives Fluentdat's pages one matching set of file versions: an import map sends every module to "file.js?v=<hash of all the
# code>", and the stylesheet is "app.css?v=<the same>", so a browser never mixes a new app.js with an old cached backend.js or app.css (GitHub Pages caches each file for 10
# minutes). It also makes customize.html, the Customize site: the same page as index.html, opened as Customize (app.js shows that instead of the chat).
import hashlib, pathlib, re, sys
root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent)
mods = sorted(p.name for p in root.glob('*.js'))           # (every module the page loads, whatever gets added)
styles = sorted(p.name for p in root.glob('*.css'))
v = hashlib.sha1(b''.join((root / m).read_bytes() for m in mods + styles)).hexdigest()[:8]
page = (root / 'index.html').read_text()
block = ('<script type="importmap">{ "imports": {\n'
         + ',\n'.join(f'    "./{m}": "./{m}?v={v}"' for m in mods)
         + '\n  } }</script>\n  <script type="module" src="app.js?v=' + v + '"></script>')
new, n = re.subn(r'(<script type="importmap">.*?</script>\n  )?<script type="module" src="app\.js(\?v=[0-9a-f]+)?"></script>', lambda m: block, page, flags=re.S)
assert n == 1, 'module script tag not found'
new, n = re.subn(r'<link rel="stylesheet" href="app\.css(\?v=[0-9a-f]+)?">', f'<link rel="stylesheet" href="app.css?v={v}">', new)
assert n == 1, 'stylesheet link not found'
(root / 'index.html').write_text(new)
# the Customize site: index.html, marked as Customize
custom, n = re.subn(r'<html lang="en">', '<html lang="en" data-customize="1">', new, count=1)
assert n == 1, '<html lang="en"> not found'
custom = re.sub(r'<title>[^<]*</title>', '<title>Fluentdat Customize</title>', custom, count=1)
custom = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="Make Fluentdat yours: its theme, its layout and every part of it.">', custom, count=1)
head, rest = custom.split('\n', 1)                         # (after the doctype: anything before it would put the page in quirks mode)
(root / 'customize.html').write_text(head + '\n<!-- Made by tools/stamp.py from index.html: change that, then run it again. -->\n' + rest)
print('version', v)
