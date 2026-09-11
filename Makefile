BUILD = htdocs/index.html
ARCHIVE = archive.zip

all: $(ARCHIVE)

$(BUILD): src/index.html src/src.js bin/build.mjs bin/packing.json package-lock.json svg/atlas.svg svg/atlas.json bin/atlas.py
	python3 bin/atlas.py
	node bin/build.mjs

$(ARCHIVE): $(BUILD) bin/archive.py bin/deflate.mjs package-lock.json
	python3 bin/archive.py

atlas:
	python3 bin/atlas.py

test: all
	python3 tests/atlas.py
	node tests/playthrough.mjs

clean:
	rm -f $(BUILD) $(ARCHIVE)

up:
	scp $(BUILD) hhsw.de@ssh.strato.de:sites/proto/js13k2026
