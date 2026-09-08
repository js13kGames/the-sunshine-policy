import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
const { chromium } = await import(process.env.PLAYWRIGHT_PATH || 'playwright')
const root = resolve('.'), output = resolve('tests/output')
await mkdir(output, { recursive: true })
const server = createServer(async (request, response) => {
	try {
		const pathname = new URL(request.url, 'http://localhost').pathname
		const path = resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname))
		if (!path.startsWith(root + '/')) { throw Error('Bad path') }
		response.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : 'text/html')
		response.end(await readFile(path))
	} catch {
		response.writeHead(404).end()
	}
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const chrome = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) })
const base = `http://127.0.0.1:${server.address().port}/${process.env.GAME_SOURCE ? 'src' : 'htdocs'}/`
let checks = 0
const errors = []
async function run(mobile, reverse = false) {
	const context = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } })
	const page = await context.newPage()
	page.on('pageerror', error => (errors.push(error.message), console.error('BROWSER', error.message)))
	page.on('console', message => { if (message.type() == 'error' && !message.text().includes('404')) { errors.push(message.text()) } })
	await page.goto(base)
	const click = async selector => mobile ? page.locator(selector).tap() : page.locator(selector).click()
	const item = async name => click(`#inventory button[aria-label="Use ${name}"]`)
	const has = async name => page.locator(`#inventory button[aria-label="Use ${name}"]`).count()
	const at = async name => { assert.equal(await page.locator('#location').textContent(), name); ++checks }
	const clear = async () => {
		for (let n = 0; await page.locator('#bubble').isVisible(); ++n) {
			assert.ok(n < 35, 'Dialog failed to finish')
			assert.equal(await page.locator('#choices button').count(), 0, 'Unexpected choice')
			if (mobile) { await click('#bubble') } else { await page.keyboard.press('Space') }
		}
	}
	const act = async id => { await click(`[data-action="${id}"]`); await clear() }
	const snap = async name => {
		const layout = await page.evaluate(() => ({ x: scrollX, width: innerWidth, frame: document.getElementById('frame').getBoundingClientRect().toJSON(), scale: visualViewport.scale }))
		if (mobile && (layout.x || layout.frame.x < 0)) { console.log('LAYOUT', name, layout) }
		await page.screenshot({ path: `${output}/${mobile ? 'mobile' : reverse ? 'alternate' : 'desktop'}-${name}.png` })
	}
	const travel = async (...ids) => { for (const id of ids) { await act(id) } }
	await snap('title')
	await click('#start')
	// Resizing during a conversation must not replay or discard it.
	const opening = await page.locator('#words').textContent()
	if (!mobile) {
		await page.setViewportSize({ width: 1100, height: 720 })
		assert.equal(await page.locator('#words').textContent(), opening)
		await page.setViewportSize({ width: 1280, height: 800 })
	}
	await clear()
	assert.equal(await has('Royal order'), 1)
	await snap('court')
	await act('Biscuit')
	await travel('toMill')
	await click('[data-action="Iris"]')
	await page.getByRole('button', {name:"Why isn't the mill turning?",exact:false}).click()
	await clear()
	await snap('mill')
	async function toolsAndWater() {
		await travel('workshop')
		await act('diagram')
		await act('Oil')
		await act('Spanner')
		await snap('workshop')
		await travel('outside', 'sluice')
		await item('Spanner')
		assert.match(await page.locator('#words').textContent(), /Too stiff/)
		await clear()
		assert.equal(await has('Spanner'), 1)
		await item('Oil can'); await clear()
		await item('Spanner'); await clear()
		assert.equal(await has('Oil can'), 0)
		assert.equal(await has('Spanner'), 0)
		await snap('sluice')
		await travel('engine')
		await act('tank')
		await act('Ledger')
		await act('lever')
		await snap('engine')
		await travel('ladder')
		await snap('roof')
		// Every initial shutter is one turn away from its correct symbol.
		await act('dial0'); await act('dial1'); await act('dial2')
		await travel('down', 'spillway', 'mill')
	}
	if (reverse) { await toolsAndWater() }
	await travel('meadow')
	await item('Biscuit')
	assert.match(await page.locator('#words').textContent(), /Freedom first/)
	await clear()
	assert.equal(await has('Biscuit'), 1)
	await act('Bird')
	await item('Royal order'); await clear()
	assert.equal(await has('Royal order'), 0)
	assert.equal(await has('Brass key'), 1)
	await item('Brass key'); await clear()
	await item('Biscuit'); await clear()
	await snap('meadow')
	if (!reverse) {
		await travel('mill')
		await toolsAndWater()
		await travel('meadow')
	}
	await act('Unicorn')
	assert.equal(await has('Unicorn hair'), 1)
	await travel('mill', 'palace')
	await item('Sales ledger'); await clear()
	assert.equal(await has('Prism'), 1)
	// Restore the actual saved game, with inventory and solved machinery intact.
	await page.reload()
	await click('#resume')
	await at('The palace terrace')
	assert.equal(await has('Prism'), 1)
	await travel('toMill', 'sluice', 'engine')
	await item('Unicorn hair'); await clear()
	await act('lever')
	await travel('ladder')
	await item('Prism'); await clear()
	await snap('lantern-ready')
	// Deliberately undo a shutter and ensure the release stays safe and recoverable.
	await act('dial0')
	await travel('down')
	await click('[data-action="lever"]')
	assert.match(await page.locator('#words').textContent(), /three shutters/)
	await clear()
	await travel('ladder')
	await act('dial0'); await act('dial0')
	await travel('down')
	await act('lever')
	await at('The way home')
	await snap('rainbow')
	await act('Unicorn')
	assert.match(await page.locator('#menu').textContent(), /The rain came home/)
	await snap('end')
	assert.equal(await page.locator('#inventory button').count(), 0)
	await page.reload()
	await click('#resume')
	assert.match(await page.locator('#menu').textContent(), /The rain came home/)
	checks += 16
	await context.close()
}
try {
	await run(false)
	await run(false, true)
	await run(true, true)
	assert.deepEqual(errors, [])
	console.log(`PASS: ${checks} checks; complete desktop, alternate-order and touch playthroughs; save/reload; no browser errors.`)
} finally {
	await browser.close()
	server.close()
}
