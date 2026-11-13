import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'build')
os.makedirs(OUT, exist_ok=True)
src = open(os.path.join(HERE, '..', 'index.html'), encoding='utf-8').read()
# the live page's analytics beacon stays out of the CrazyGames build
src = re.sub(r"<!-- Cloudflare Web Analytics -->.*?<!-- End Cloudflare Web Analytics -->\n?", '', src)
s = src
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: sys.exit(f"expected {count} of {old[:70]!r}, found {n}")
    s = s.replace(old, new)

# 1. head: local fonts + SDK, no third-party analytics
rep('<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n',
    '')
s = re.sub(r'<link href="https://fonts\.googleapis\.com/css2[^"]*" rel="stylesheet">',
           '<link rel="stylesheet" href="fonts/fonts.css">\n<!-- Load the CrazyGames SDK before the game code -->\n<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>\n<script>document.documentElement.classList.add("cg");</script>', s)

# 2. CSS for the fixed 16:9 stage
CSS = open(os.path.join(HERE, 'cg.css'), encoding='utf-8').read()
rep('</style>', CSS + '</style>')

# 3. HTML: header + record into the left column, signature into the score row
m = re.search(r'  <header>.*?</header>\n', s, re.S); header = m.group(0); s = s.replace(header, '')
rep('  <div class="left">\n', '  <div class="left">\n' + header)
m = re.search(r'    <div class="record" id="record">.*?</button>\n    </div>\n', s, re.S); record = m.group(0); s = s.replace(record, '')
rep('  </div>\n  </div>\n\n  <div class="right m-docket" id="right">', record + '  </div>\n  </div>\n\n  <div class="right m-docket" id="right">')
m = re.search(r'        <div class="sign">.*?</div></div>\n', s, re.S); sign = m.group(0); s = s.replace(sign, '')
# signature goes inside the score row, after the scales
rep('          </svg>\n        </div>\n        <div class="meter"', '          </svg>\n' + sign.replace('        ', '          ', 1) + '        </div>\n        <div class="meter"')


# 4. JS: start after the SDK is ready
rep('<script>\n(function () {\n  var VERDICTS', '<script>\n' + open(os.path.join(HERE, 'cg_boot.js'), encoding='utf-8').read() + '\nfunction startGame() {\n  var VERDICTS')
rep('    copyShare();\n  });\n})();\n</script>', '    copyShare();\n  });\n' + open(os.path.join(HERE, 'cg_game.js'), encoding='utf-8').read() + '}\nCG.boot(startGame);\n</script>')

# storage through the CrazyGames data module when it is available
rep('try { var v = localStorage.getItem(key);', 'try { var v = CG.store().getItem(key);')
rep('try { localStorage.setItem(key, JSON.stringify(value)); }', 'try { CG.store().setItem(key, JSON.stringify(value)); }')
# sound respects the platform mute
rep('    if (!soundOn) return null;\n    var AC', '    if (!soundOn || CG.muted) return null;\n    var AC')
# no page scrolling inside the stage
rep('    if (rect.top > window.innerHeight * 0.45 || rect.top < 0) {', '    if (!CG.stage && (rect.top > window.innerHeight * 0.45 || rect.top < 0)) {')
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(s)
print('ok', len(s))
