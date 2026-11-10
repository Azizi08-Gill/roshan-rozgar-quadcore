"""Generate React screen components from the captured design HTML.

Input:  raw/capture/{web,mobile}__<Label>.html  (rendered screens from the design bundles)
Output: src/screens/{web,mobile}/<Name>.tsx + src/screens/registry.ts
"""
import html, json, os, re, shutil
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAP = os.path.join(ROOT, 'raw', 'capture')
OUT = os.path.join(ROOT, 'src', 'screens')

VOID = {'br', 'img', 'hr', 'input', 'meta', 'link'}
TAG_CASE = {'lineargradient': 'linearGradient', 'radialgradient': 'radialGradient',
            'clippath': 'clipPath', 'foreignobject': 'foreignObject'}
ATTR_CASE = {'class': 'className', 'for': 'htmlFor', 'tabindex': 'tabIndex',
             'viewbox': 'viewBox', 'preserveaspectratio': 'preserveAspectRatio',
             'gradientunits': 'gradientUnits', 'gradienttransform': 'gradientTransform'}
DROP_ATTRS = {'data-dc-tpl'}
DROP_CLASSES = {'sc-interp'}


def camel(s):
    return re.sub(r'-([a-z])', lambda m: m.group(1).upper(), s)


def split_decls(style):
    out, depth, cur = [], 0, ''
    for ch in style:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        if ch == ';' and depth == 0:
            out.append(cur); cur = ''
        else:
            cur += ch
    out.append(cur)
    return [d for d in (x.strip() for x in out) if d]


def style_obj(style):
    parts = []
    for d in split_decls(style):
        if ':' not in d:
            continue
        k, v = d.split(':', 1)
        k = k.strip(); v = v.strip()
        key = k if k.startswith('--') else camel(k)
        if k.startswith('-webkit-'):
            key = 'Webkit' + camel(k[len('-webkit-'):])[0].upper() + camel(k[len('-webkit-'):])[1:]
        parts.append(f'{json.dumps(key)}:{json.dumps(v)}')
    return '{{' + ','.join(parts) + '}}'


def img_map():
    """uuid png -> tileN name, from the resource maps injected into raw/*/index.html."""
    m = {}
    for d in ('web', 'mobile'):
        h = open(os.path.join(ROOT, 'raw', d, 'index.html'), encoding='utf-8').read()
        res = json.loads(re.search(r'window.__resources=(\{.*?\});', h).group(1))
        for k, v in res.items():
            if k.startswith('tile'):
                m[v] = (d, k)
    return m


IMG = img_map()


class Conv(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []

    def handle_starttag(self, tag, attrs, selfclose=False):
        tag = TAG_CASE.get(tag, tag)
        a = []
        for k, v in attrs:
            if k in DROP_ATTRS:
                continue
            v = '' if v is None else v
            if k == 'class':
                v = ' '.join(c for c in v.split() if c not in DROP_CLASSES)
                if not v:
                    continue
            if k == 'style':
                a.append(f'style={style_obj(v)}')
                continue
            if k == 'src' and v in IMG:
                d, t = IMG[v]
                v = f'/images/{d}-{t}.png'
            if k == 'href' and v.startswith('#'):
                continue  # in-board anchors only
            name = ATTR_CASE.get(k) or (k if k.startswith(('data-', 'aria-')) else camel(k))
            a.append(f'{name}={json.dumps(v)}')
        attrs_s = (' ' + ' '.join(a)) if a else ''
        if tag in VOID or selfclose:
            self.out.append(f'<{tag}{attrs_s} />')
        else:
            self.out.append(f'<{tag}{attrs_s}>')

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs, selfclose=True)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        self.out.append(f'</{TAG_CASE.get(tag, tag)}>')

    def handle_data(self, data):
        if not data:
            return
        if not data.strip():
            self.out.append(' ' if ' ' in data else '')
            return
        self.out.append('{' + json.dumps(data) + '}' if re.search(r'[{}<>]', data) else data)


def comp_name(label):
    code, _, rest = label.partition(' ')
    words = re.sub(r'[^A-Za-z0-9 ]', ' ', rest).split()
    return code.capitalize() + ''.join(w[0].upper() + w[1:] for w in words)


def slug(label):
    return re.sub(r'[^a-z0-9]+', '-', label.lower()).strip('-')


def main():
    reg = {'web': [], 'mobile': []}
    for d in ('web', 'mobile'):
        shutil.rmtree(os.path.join(OUT, d), ignore_errors=True)
        os.makedirs(os.path.join(OUT, d))
    for f in sorted(os.listdir(CAP)):
        if not f.endswith('.html'):
            continue
        platform, raw = f[:-5].split('__', 1)
        label = raw.replace('_20', ' ')
        if label.startswith('Voice ') and platform == 'mobile':
            label = 'S2' + {'ready': '5', 'listening': '6', 'processing': '7', 'confirm': '8', 'error': '9'}[label.split()[1]] + ' Voice ' + label.split()[1]
        c = Conv()
        c.feed(open(os.path.join(CAP, f), encoding='utf-8').read())
        jsx = ''.join(c.out)
        name = comp_name(label)
        src = (f'// Generated from the "{label}" design screen. Do not hand-edit layout values;\n'
               f'// re-run `npm run gen` after updating raw/capture.\n'
               f'export default function {name}() {{\n  return (\n    {jsx}\n  );\n}}\n')
        open(os.path.join(OUT, platform, name + '.tsx'), 'w', encoding='utf-8').write(src)
        reg[platform].append((label, name))
    lines = ["import type { ComponentType } from 'react';"]
    entries = {}
    for p, items in reg.items():
        items.sort(key=lambda x: (x[0][0] != ('W' if p == 'web' else 'S'), x[0]))
        for label, name in items:
            lines.append(f"import {p.capitalize()}{name} from './{p}/{name}';")
        entries[p] = items
    lines.append('\nexport type Screen = { slug: string; label: string; Component: ComponentType };')
    for p, items in entries.items():
        lines.append(f'\nexport const {p}Screens: Screen[] = [')
        for label, name in items:
            lines.append(f"  {{ slug: {json.dumps(slug(label))}, label: {json.dumps(label)}, Component: {p.capitalize()}{name} }},")
        lines.append('];')
    open(os.path.join(OUT, 'registry.ts'), 'w').write('\n'.join(lines) + '\n')
    print({p: len(v) for p, v in reg.items()})


if __name__ == '__main__':
    main()
