.PHONY: all clean serve test
all: archive.zip

htdocs/index.html: src/index.html src/src.js bin/build.mjs bin/packing.json package-lock.json
	node bin/build.mjs

archive.zip: htdocs/index.html bin/archive.py
	python3 bin/archive.py

serve:
	python3 -m http.server 8080 --bind 127.0.0.1

test: all
	node tests/playthrough.mjs

clean:
	rm -f htdocs/index.html archive.zip
