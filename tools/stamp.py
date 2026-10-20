# Run before each update (python3 tools/stamp.py). Gives Fluentdat's page one matching set of file versions: an import map sends every module to "file.js?v=<hash of all the
# code>", so a browser never mixes a new app.js with an old cached backend.js (GitHub Pages caches each file for 10 minutes).
import hashlib, pathlib, re, sys
root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent)
mods = ['app.js', 'ui.js', 'backend.js', 'store.js', 'github.js', 'supabase.js', 'config.js']
v = hashlib.sha1(b''.join((root / m).read_bytes() for m in mods)).hexdigest()[:8]
page = (root / 'index.html').read_text()
block = ('<script type="importmap">{ "imports": {\n'
         + ',\n'.join(f'    "./{m}": "./{m}?v={v}"' for m in mods)
         + '\n  } }</script>\n  <script type="module" src="app.js?v=' + v + '"></script>')
new, n = re.subn(r'(<script type="importmap">.*?</script>\n  )?<script type="module" src="app\.js(\?v=[0-9a-f]+)?"></script>', lambda m: block, page, flags=re.S)
assert n == 1, 'module script tag not found'
(root / 'index.html').write_text(new)
print('version', v)
