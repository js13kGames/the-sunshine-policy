.PHONY: all atlas clean serve test
all: archive.zip

htdocs/index.html: src/index.html src/src.js bin/build.mjs bin/packing.json package-lock.json svg/atlas.svg svg/atlas.json bin/atlas.py
	python3 bin/atlas.py
	node bin/build.mjs

archive.zip: htdocs/index.html bin/archive.py bin/deflate.mjs package-lock.json
	python3 bin/archive.py

atlas:
	python3 bin/atlas.py

serve: atlas
	python3 -m http.server 8080 --bind 127.0.0.1

test: all
	python3 tests/atlas.py
	node tests/playthrough.mjs

clean:
	rm -f htdocs/index.html archive.zip
