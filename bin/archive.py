from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

# A fixed timestamp makes builds reproducible.
entry = ZipInfo('index.html', (2026, 1, 1, 0, 0, 0))
entry.compress_type = ZIP_DEFLATED
with ZipFile('archive.zip', 'w', compression=ZIP_DEFLATED, compresslevel=9) as archive:
    archive.writestr(entry, Path('htdocs/index.html').read_bytes(), compresslevel=9)
size = Path('archive.zip').stat().st_size
print(f'{size:,} / 13,312 bytes ({13_312 - size:,} bytes free)')
if size > 13_312:
    raise SystemExit('The JS13K size limit was exceeded.')
