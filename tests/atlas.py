"""Exercise editing and reimporting the real object atlas without changing it."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('atlas_importer', ROOT / 'bin/atlas.py')
atlas = importlib.util.module_from_spec(spec)
spec.loader.exec_module(atlas)
NS = '{http://www.w3.org/2000/svg}'


class AtlasEditing(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'atlas.svg'
        self.original = (ROOT / 'svg/atlas.svg').read_bytes()
        self.path.write_bytes(self.original)
        self.manifest = ROOT / 'svg/atlas.json'
        self.root = ET.fromstring(self.original, parser=ET.XMLParser(target=ET.TreeBuilder(insert_comments=True)))
        self.baseline = self.imported()

    def imported(self):
        return atlas.definitions(self.path, self.manifest)

    def save(self):
        ET.ElementTree(self.root).write(self.path, encoding='unicode')

    def obj(self, name):
        return next(node for node in self.root.iter() if node.get('id') == name)

    def test_one_master_per_object_without_sheet_layout(self):
        imported = ET.fromstring(self.baseline)
        expected = [item['id'] for item in json.loads(self.manifest.read_text())['assets']]
        self.assertEqual([node.get('id') for node in imported], expected)
        self.assertEqual(len(expected), len(set(expected)))
        self.assertNotIn('slot-', self.baseline)
        self.assertNotIn('atlas-background', self.baseline)
        self.assertEqual(self.path.read_bytes(), self.original)

    def test_sheet_layout_does_not_change_game_objects(self):
        slot = self.obj('slot-Nell')
        slot.set('transform', 'translate(800 400) scale(3)')
        self.root.remove(slot)
        self.root.insert(0, slot)
        self.obj('label-Nell').text = 'My label'
        self.save()
        self.assertEqual(self.imported(), self.baseline)

    def test_object_edit_and_shared_references_survive_import(self):
        master = self.obj('Nell')
        master.set('transform', 'translate(2 3)')
        ET.SubElement(master, NS + 'path', {'id': 'edited-hat', 'd': 'M0 0L8 4L0 8Z', 'fill': '#ff00ff'})
        ET.SubElement(master, NS + 'use', {'href': '#Cloud'})
        self.save()
        result = self.imported()
        self.assertIn('id="edited-hat"', result)
        self.assertIn('transform="translate(2 3)"', result)
        self.assertNotIn('href="#Figure"', result)
        self.assertEqual(result.count('id="Cloud"'), 1)
        self.assertIn('href="#Cloud"', result)
        self.assertNotEqual(result, self.baseline)

    def test_editor_resources_and_xlink_roundtrip(self):
        defs = ET.SubElement(self.root, NS + 'defs')
        gradient = ET.SubElement(defs, NS + 'linearGradient', {'id': 'new-paint'})
        ET.SubElement(gradient, NS + 'stop', {'offset': '0', 'stop-color': '#fff'})
        master = self.obj('Nell')
        # Editors can put resources inside object groups, too.
        nested = ET.SubElement(master, NS + 'defs')
        clip = ET.SubElement(nested, NS + 'clipPath', {'id': 'new-clip'})
        ET.SubElement(clip, NS + 'rect', {'width': '100', 'height': '100'})
        ET.SubElement(master, NS + 'use', {
            '{http://www.w3.org/1999/xlink}href': '#Bench',
            'fill': 'url(#new-paint)', 'clip-path': 'url(#new-clip)'})
        self.save()
        template = '<svg><defs></defs><g id="scene"/></svg>'
        first = atlas.import_atlas(self.path, self.manifest, template)
        self.assertEqual(atlas.import_atlas(self.path, self.manifest, first), first)
        self.assertIn('id="new-paint"', first)
        self.assertIn('xlink:href="#Bench"', first)
        self.assertTrue(first.endswith('<g id="scene"/></svg>'))

    def test_missing_or_duplicate_master_is_rejected(self):
        self.obj('Nell').set('id', 'RenamedNell')
        self.save()
        with self.assertRaisesRegex(ValueError, 'Missing object IDs: Nell'):
            self.imported()
        self.obj('RenamedNell').set('id', 'Nell')
        ET.SubElement(self.root, NS + 'g', {'id': 'Nell'})
        self.save()
        with self.assertRaisesRegex(ValueError, 'Duplicate SVG ID: Nell'):
            self.imported()

    def test_broken_reference_is_rejected(self):
        ET.SubElement(self.obj('Nell'), NS + 'use', {'href': '#missing-object'})
        self.save()
        with self.assertRaisesRegex(ValueError, 'Missing referenced SVG object'):
            self.imported()

    def test_scenes_are_whole_and_state_parts_stay_inside(self):
        imported = ET.fromstring(self.baseline)
        scene = next(node for node in imported if node.get('id') == 'SluiceScene')
        self.assertIsNotNone(next(node for node in scene.iter() if node.get('id') == 'GatePanel'))
        self.assertNotIn('GatePanel', [node.get('id') for node in imported])
        self.obj('GatePanel').set('id', 'renamed-gate')
        self.save()
        with self.assertRaisesRegex(ValueError, 'Missing object IDs: GatePanel'):
            self.imported()

    def test_current_template_is_synced_and_roundtrip_is_stable(self):
        template = (ROOT / 'src/index.html').read_text()
        self.assertEqual(atlas.import_atlas(self.path, self.manifest, template), template)
        self.assertEqual(self.path.read_bytes(), self.original)


if __name__ == '__main__':
    unittest.main()
