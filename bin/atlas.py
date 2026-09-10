#!/usr/bin/env python3
"""Import the editable SVG object masters into the game's inline definitions."""
import argparse
import copy
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

SVG = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG)
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')


def definitions(atlas_path, manifest_path):
    parser = ET.XMLParser(target=ET.TreeBuilder(insert_comments=True))
    root = ET.parse(atlas_path, parser=parser).getroot()
    manifest = json.loads(Path(manifest_path).read_text())
    expected = [entry['id'] for entry in manifest['assets']]
    if len(expected) != len(set(expected)):
        raise ValueError('Duplicate object ID in atlas.json')
    indexed = {}
    parents = {child: parent for parent in root.iter() for child in parent}
    for element in root.iter():
        ident = element.get('id')
        if ident:
            if ident in indexed:
                raise ValueError(f'Duplicate SVG ID: {ident}')
            indexed[ident] = element
    missing = (set(expected) | set(manifest.get('required_ids', []))) - indexed.keys()
    if missing:
        raise ValueError('Missing object IDs: ' + ', '.join(sorted(missing)))
    result = ET.Element(f'{{{SVG}}}defs')
    # Editor-created gradients, clips and styles are resources, not atlas layout.
    for child in root:
        if child.tag == f'{{{SVG}}}defs':
            result.extend(copy.deepcopy(list(child)))
        elif child.tag == f'{{{SVG}}}style':
            result.append(copy.deepcopy(child))
    for ident in expected:
        original = indexed[ident]
        if original.tag != f'{{{SVG}}}g':
            raise ValueError(f'Object {ident} must remain an SVG group')
        ancestor = parents.get(original)
        while ancestor is not None:
            if ancestor.get('id') in expected:
                raise ValueError(f'Object {ident} is nested in another object master')
            ancestor = parents.get(ancestor)
        result.append(copy.deepcopy(original))
    # Keep only SVG content; editor metadata does not belong in the game.
    for parent in list(result.iter()):
        for child in list(parent):
            if isinstance(child.tag, str) and (not child.tag.startswith(f'{{{SVG}}}') or child.tag == f'{{{SVG}}}metadata'):
                parent.remove(child)
        for attr in list(parent.attrib):
            if attr.startswith('{') and not attr.startswith('{http://www.w3.org/1999/xlink}'):
                del parent.attrib[attr]
        if parent.text and not parent.text.strip():
            parent.text = None
        if parent.tail and not parent.tail.strip():
            parent.tail = None
    ids = [element.get('id') for element in result.iter() if element.get('id')]
    if len(ids) != len(set(ids)):
        raise ValueError('An object master also occurs in SVG resources')
    for element in result.iter():
        for attr, value in element.attrib.items():
            refs = re.findall(r'url\([\'\"]?#([^\)\'\"]+)[\'\"]?\)', value)
            if attr in ('href', '{http://www.w3.org/1999/xlink}href'):
                if not value.startswith('#'):
                    raise ValueError('The game needs local SVG references: ' + value)
                refs.append(value[1:])
            for ref in refs:
                if ref not in ids:
                    raise ValueError('Missing referenced SVG object or resource: ' + ref)
    ET.indent(result, space=' ')
    return ET.tostring(result, encoding='unicode').replace(f' xmlns="{SVG}"', '', 1)


def import_atlas(atlas, manifest, template):
    block = definitions(atlas, manifest)
    spans = []
    depth = 0
    for tag in re.finditer(r'<(/?)defs\b[^>]*>', template):
        if not tag[1]:
            if depth == 0:
                start = tag.start()
            depth += 1
        if tag[1] or tag[0].endswith('/>'):
            depth -= 1
            if depth == 0:
                spans.append((start, tag.end()))
        if depth < 0:
            raise ValueError('Unbalanced inline <defs> block')
    if depth or len(spans) != 1:
        raise ValueError('Expected one inline <defs> block in the game template')
    start, end = spans[0]
    return template[:start] + block + template[end:]


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--atlas', type=Path, default=Path('svg/atlas.svg'))
    cli.add_argument('--manifest', type=Path, default=Path('svg/atlas.json'))
    cli.add_argument('--html', type=Path, default=Path('src/index.html'))
    cli.add_argument('--check', action='store_true', help='Fail if the inline artwork is stale')
    args = cli.parse_args()
    previous = args.html.read_text()
    updated = import_atlas(args.atlas, args.manifest, previous)
    if updated != previous:
        if args.check:
            raise SystemExit('Inline artwork is stale. Run make atlas.')
        args.html.write_text(updated)


if __name__ == '__main__':
    main()
