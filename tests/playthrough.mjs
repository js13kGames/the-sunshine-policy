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
async function verifyCloudMotion(page) {
	const samples = await page.evaluate(() => {
		const probe = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
		probe.setAttribute('viewBox', '0 0 160 100')
		probe.style.cssText = 'position:fixed;width:160px;height:100px;opacity:0;pointer-events:none'
		const scene = document.getElementById('CourtScene').cloneNode(true)
		scene.removeAttribute('id')
		probe.append(scene)
		document.body.append(probe)
		try {
			const clouds = [...probe.querySelectorAll('.drift')]
			return [0, 5000, 10000, 15000, 20000].map(time => clouds.map(cloud => {
				cloud.getAnimations().forEach(animation => { animation.pause(); animation.currentTime = time })
				const { a, b, c, d, e, f } = cloud.getCTM()
				return { a, b, c, d, e, f }
			}))
		} finally { probe.remove() }
	})
	for (const [step, clouds] of samples.entries()) {
		assert.equal(clouds.length, 2)
		for (const [i, matrix] of clouds.entries()) {
			const scale = [.9, 1.2][i], phase = [0, .5, 1, .5, 0][step]
			const expected = { a: scale, b: 0, c: 0, d: scale, e: [8, 100][i] + 12 * scale * phase, f: [11, 18][i] }
			for (const key of Object.keys(expected)) {
				assert.ok(Math.abs(matrix[key] - expected[key]) < .001, `Cloud ${i}, step ${step}: ${key}=${matrix[key]}, expected ${expected[key]}`)
			}
			++checks
		}
	}
}
async function verifyRainMotion(page) {
	const result = await page.evaluate(async () => {
		const probe = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
		probe.setAttribute('viewBox', '0 0 160 100')
		probe.style.cssText = 'position:fixed;width:160px;height:100px;opacity:0;pointer-events:none'
		const rain = document.getElementById('Rain').cloneNode(true)
		probe.append(rain)
		document.body.append(probe)
		try {
			const moving = rain.querySelector('.rain'), animation = moving.getAnimations()[0]
			animation.pause()
			animation.effect.updateTiming({ iterations: 1, fill: 'forwards' })
			const duration = animation.effect.getTiming().duration, frames = []
			for (const time of [0, duration / 2, duration]) {
				animation.currentTime = time
				const frame = rain.cloneNode(true)
				frame.querySelector('.rain').setAttribute('style', `transform:${getComputedStyle(moving).transform}`)
				const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 160 100">${new XMLSerializer().serializeToString(frame)}</svg>`
				const image = new Image(), url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
				try {
					image.src = url
					await image.decode()
					const canvas = document.createElement('canvas')
					canvas.width = 640; canvas.height = 400
					const context = canvas.getContext('2d')
					context.drawImage(image, 0, 0)
					frames.push(context.getImageData(0, 0, 640, 400).data)
				} finally { URL.revokeObjectURL(url) }
			}
			const difference = (a, b) => a.reduce((sum, value, i) => sum + (Math.abs(value - b[i]) > 2 ? 1 : 0), 0)
			return { seam: difference(frames[0], frames[2]), motion: difference(frames[0], frames[1]), visible: frames[0].some(value => value > 0) }
		} finally { probe.remove() }
	})
	assert.equal(result.visible, true, 'Rain must be visible')
	assert.equal(result.seam, 0, 'The final rain frame must tile exactly into the first')
	assert.ok(result.motion > 100, 'Rain must move between loop boundaries')
	checks += 3
}

async function run(mobile, reverse = false) {
	const context = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } })
	// An old saved game must not enable Continue or restore its inventory.
	await context.addInitScript(() => localStorage.setItem('last-rainbow-v1', JSON.stringify({ scene: 'End', inventory: ['Prism'], taken: ['Biscuit'], shutters: [0, 1, 2], intro: true, ended: true })))
	const page = await context.newPage()
	page.on('pageerror', error => (errors.push(error.message), console.error('BROWSER', error.message)))
	page.on('console', message => { if (message.type() == 'error' && !message.text().includes('404')) { errors.push(message.text()) } })
	await page.goto(base)
	if (!mobile && !reverse) { await verifyCloudMotion(page); await verifyRainMotion(page) }
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
	assert.equal(await page.locator('#resume').count(), 0)
	const legacySave = await page.evaluate(() => localStorage.getItem('last-rainbow-v1'))
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
	await page.getByRole('button', {name:'How does the lantern work?',exact:false}).click()
	assert.equal(await page.locator('#speaker').textContent(), 'Iris')
	await click('#bubble')
	assert.equal(await page.locator('#speaker').textContent(), 'Iris')
	await clear()
	await click('[data-action="Iris"]')
	await page.getByRole('button', {name:"Why isn't the mill turning?",exact:false}).click()
	await clear()
	await snap('mill')
	async function toolsAndWater() {
		await travel('workshop')
		await click('[data-action="diagram"]')
		assert.equal(await page.locator('#speaker').textContent(), 'Nell')
		await click('#bubble')
		assert.equal(await page.locator('#speaker').textContent(), 'Nell')
		await clear()
		checks += 4
		await act('Oil')
		await act('Spanner')
		await snap('workshop')
		await travel('outside', 'sluice')
		await click('[data-action="Crank"]')
		assert.match(await page.locator('#words').textContent(), /Rust/)
		await clear()
		await item('Spanner')
		assert.match(await page.locator('#words').textContent(), /Too stiff/)
		await clear()
		assert.equal(await has('Spanner'), 1)
		await item('Oil can'); await clear()
		await item('Spanner'); await clear()
		assert.equal(await has('Oil can'), 0)
		assert.equal(await has('Spanner'), 0)
		await click('[data-action="Spanner"]')
		assert.match(await page.locator('#words').textContent(), /sluice is open/)
		await clear()
		checks += 2
		await snap('sluice')
		await travel(reverse ? 'passage' : 'engine')
		await act('tank')
		await act('Ledger')
		await act('lever')
		await snap('engine')
		await travel('ladder')
		await snap('roof')
		// Every initial shutter is one turn away from its correct symbol.
		const roof = await page.locator('#world > g').first().elementHandle()
		await page.evaluate(() => { window.cloudClocks = document.getAnimations().filter(a => a.animationName == 'drift').map(a => [a, a.currentTime]) })
		await act('dial0'); await act('dial1'); await act('dial2')
		assert.equal(await roof.evaluate(node => node.isConnected), true, 'Shutters must retain the scene and its animated clouds')
		assert.equal(await page.evaluate(() => window.cloudClocks.every(([a, time]) => document.getAnimations().includes(a) && a.currentTime >= time)), true)
		for (const [i, symbol] of ['Light', 'Rain', 'Horn'].entries()) {
			assert.match(await page.locator(`[data-action="dial${i}"]`).getAttribute('aria-label'), new RegExp(symbol))
		}
		checks += 5
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
	assert.equal(await page.evaluate(() => localStorage.getItem('last-rainbow-v1')), legacySave)
	// Reload must offer only a new adventure, including after completion.
	await page.reload()
	assert.equal(await page.locator('#cover').isVisible(), true)
	assert.equal(await page.locator('#resume').count(), 0)
	await click('#start'); await clear()
	await at('The palace terrace')
	assert.equal(await has('Royal order'), 1)
	assert.equal(await has('Prism'), 0)
	assert.equal(await page.locator('#menu').isVisible(), false)
	checks += 22
	await context.close()
}
try {
	await run(false)
	await run(false, true)
	await run(true, true)
	assert.deepEqual(errors, [])
	console.log(`PASS: ${checks} checks; complete desktop, alternate-order and touch playthroughs; fresh starts after reload; no browser errors.`)
} finally {
	await browser.close()
	server.close()
}
