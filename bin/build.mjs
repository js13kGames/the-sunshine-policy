import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { transformSync } from 'esbuild'
import { Packer } from 'roadroller'

function minify(source, loader) {
	return transformSync(source, { minify: true, target: 'es2020', charset: 'utf8', loader, ...(loader == 'js' ? { format: 'iife' } : {}) }).code.trim()
}
const script = minify(readFileSync('src/src.js', 'utf8'), 'js')
const html = readFileSync('src/index.html', 'utf8')
	.replace(/<style>([\s\S]*?)<\/style>/, (_, css) => `<style>${minify(css, 'css')}</style>`)
	.replace(/<script src="src.js"><\/script>/, () => `<script>${script}</script>`)
	.replace(/\n\s*/g, '\n').replace(/>\s+</g, '><')
const packer = new Packer([{ data: html, type: 'text', action: 'write' }], JSON.parse(readFileSync('bin/packing.json', 'utf8')))
if (process.env.PACK_LEVEL) {
	await packer.optimize(Number(process.env.PACK_LEVEL))
}
const { firstLine, secondLine } = packer.makeDecoder()
mkdirSync('htdocs', { recursive: true })
// Roadroller's generated decoder is public domain. No library is loaded at runtime.
writeFileSync('htdocs/index.html', '<!doctype html><html lang="en"><meta charset="utf-8"><body><script>' + firstLine + secondLine + '</script>')
if (process.env.PACK_LEVEL) {
	console.log(packer.options)
}
