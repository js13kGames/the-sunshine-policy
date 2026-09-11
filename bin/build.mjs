import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { transformSync } from 'esbuild'
import { Packer } from 'roadroller'
import { builtinPlugins, optimize } from 'svgo'

const collapseStaticGroups = {
	name: 'collapseStaticGroups',
	fn(root) {
		const collapse = builtinPlugins.find(plugin => plugin.name == 'collapseGroups').fn(root).element.exit
		return { element: { exit(node, parent) {
			// CSS animations must keep their own coordinate system and placement parent.
			if (node.attributes.class || node.children.some(child => child.type == 'element' && child.attributes.class)) { return }
			collapse(node, parent)
		} } }
	}
}

const removeEmptyStaticContainers = {
	name: 'removeEmptyStaticContainers',
	fn(root) {
		const visitor = builtinPlugins.find(plugin => plugin.name == 'removeEmptyContainers').fn(root)
		const remove = visitor.element.exit
		visitor.element.exit = (node, parent) => {
			// Preserve empty nodes that the game fills or animates at runtime.
			if (!node.attributes.id && !node.attributes.class) { remove(node, parent) }
		}
		return visitor
	}
}

function minify(source, loader) {
	return transformSync(source, { minify: true, target: 'es2020', charset: 'utf8', loader, ...(loader == 'js' ? { format: 'iife', mangleProps: /^(scene|inventory|taken|shutters|water|prism|free|fed|truth|hair|cord|mounted|bridge|ended|oiled)$/ } : {}) }).code.trim()
}
const script = minify(readFileSync('src/src.js', 'utf8'), 'js')
const html = readFileSync('src/index.html', 'utf8')
	// Compact editor-expanded path syntax without rounding artwork or changing IDs.
	.replace(/<svg[\s\S]*?<\/svg>/, svg => optimize(svg, { plugins: [
		collapseStaticGroups,
		{ name: 'convertShapeToPath', params: { floatPrecision: 8 } },
		{ name: 'mergePaths', params: { floatPrecision: 8 } },
		{ name: 'convertPathData', params: { floatPrecision: 8, applyTransforms: false, straightCurves: false, convertToQ: false, makeArcs: { threshold: 0, tolerance: 0 }, smartArcRounding: false } },
		'removeEmptyAttrs',
		removeEmptyStaticContainers,
		'convertStyleToAttrs',
		'convertColors',
		'sortAttrs'
	] }).data)
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
writeFileSync('htdocs/index.html', '<!doctype html><meta charset="utf-8"><body><script>' + firstLine + secondLine + '</script>')
if (process.env.PACK_LEVEL) {
	console.log(packer.options)
}
