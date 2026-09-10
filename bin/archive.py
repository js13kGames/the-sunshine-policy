from pathlib import Path
from struct import pack
from subprocess import run
from zipfile import ZipFile
from zlib import crc32

# A fixed timestamp makes builds reproducible.
date = (2026 - 1980) << 9 | 1 << 5 | 1
name = b'index.html'
source = Path('htdocs/index.html').read_bytes()
compressed = run(['node', 'bin/deflate.mjs'], input=source, capture_output=True, check=True).stdout
crc = crc32(source)
# Standard single-file ZIP with Zopfli's lossless DEFLATE stream.
local = pack('<IHHHHHIIIHH', 0x04034b50, 20, 0, 8, 0, date,
             crc, len(compressed), len(source), len(name), 0) + name + compressed
central = pack('<IHHHHHHIIIHHHHHII', 0x02014b50, 0x314, 20, 0, 8, 0, date,
               crc, len(compressed), len(source), len(name), 0, 0, 0, 0, 0o600 << 16, 0) + name
end = pack('<IHHHHIIH', 0x06054b50, 0, 0, 1, 1, len(central), len(local), 0)
Path('archive.zip').write_bytes(local + central + end)
with ZipFile('archive.zip') as archive:
    if archive.read('index.html') != source:
        raise SystemExit('ZIP round trip failed.')
size = Path('archive.zip').stat().st_size
print(f'{size:,} / 13,312 bytes ({13_312 - size:,} bytes free)')
if size > 13_312:
    raise SystemExit('The JS13K size limit was exceeded.')
