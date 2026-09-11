"use strict"

const $ = id => document.getElementById(id),
	NS = "http://www.w3.org/2000/svg",
	world = $("world"),
	stage = $("stage"),
	bubble = $("bubble"),
	itemNames = { Order: "Royal order", Biscuit: "Biscuit", Key: "Brass key", Oil: "Oil can", Spanner: "Spanner", Hair: "Unicorn hair", Ledger: "Sales ledger", Prism: "Prism" },
	sceneNames = { Court: "The palace terrace", Mill: "The old rain mill", Meadow: "The last unicorn", Workshop: "The keeper's workshop", Sluice: "The dry spillway", Engine: "Beneath the mill", Roof: "The rainbow lantern", Bridge: "The way home", End: "A change in the weather" }

let state = freshState(), actions = {}, anchors = {}, conversation = [], afterDialog,
	currentSpeaker, touchTarget, choosing = false, touchTime = 0

function freshState() {
	return { scene: "Court", inventory: [], taken: [], shutters: [2, 0, 1] }
}

function set(id, x, y, size = 1, name, action) {
	const g = document.createElementNS(NS, "g")
	g.setAttribute("transform", `translate(${x} ${y}) scale(${size})`)
	g.innerHTML = `<use href="#${id}"/>`
	world.appendChild(g)
	if (name) {
		const box = $(id).getBBox(), min = (matchMedia("(pointer: coarse)").matches ? 14 : 7) / size,
			w = Math.max(box.width, min), h = Math.max(box.height, min)
		g.insertAdjacentHTML("beforeend", `<rect class="hit" x="${box.x - (w - box.width) / 2}" y="${box.y - (h - box.height) / 2}" width="${w}" height="${h}" rx="1"/>`)
		register(g, id, name, action)
	}
	anchors[id] = g
	return g
}

function register(g, id, name, action) {
	g.dataset.action = id
	g.setAttribute("role", "button")
	g.setAttribute("tabindex", "0")
	g.setAttribute("aria-label", name)
	actions[id] = { name, action }
	g.addEventListener("focus", () => info(name))
	g.addEventListener("keydown", event => {
		if (event.key == "Enter" || event.key == " ") {
			event.preventDefault()
			event.stopPropagation()
			interact(id)
		}
	})
}

function hotspot(id, name, x, y, w, h, action) {
	if (matchMedia("(pointer: coarse)").matches) {
		const width = Math.max(14, w), height = Math.max(14, h)
		x -= (width - w) / 2
		y -= (height - h) / 2
		w = width
		h = height
	}
	const g = document.createElementNS(NS, "g")
	g.innerHTML = `<rect class="hit" x="${x}" y="${y}" width="${w}" height="${h}" rx="1"/>`
	world.appendChild(g)
	register(g, id, name, action)
	anchors[id] = g
}

function exit(id, name, x, y, to, direction = 1) {
	set("ExitArrow", x, y).firstElementChild.setAttribute("transform", `scale(${direction} 1)`)
	hotspot(id, name, x - 8, y - 4, 16, 8, () => show(to))
}

function protagonist(x = 46, y = 55, s = .8) {
	set("Nell", x, y, s, "Nell, junior weather keeper", () => say("Nell", hintText()))
}

const scenes = {
	Court: function() {
		set("CourtScene", 0, 0)
		if (!state.prism) {
			set("Prism", 113, 54, .38, "The minister's glass paperweight", () => say("Dullworth", "My paperweight. It keeps the weather reports from blowing away. Such gloomy little reports."))
		}
		set("Dullworth", 84, 41, .95, "Talk to Minister Dullworth", talkDullworth)
		protagonist(47, 54)
		if (!state.taken.includes("Biscuit")) {
			set("Biscuit", 28, 73, .3, "Take the neglected biscuit", () => take("Biscuit", "A royal biscuit. Hard enough to inherit the throne.")).firstElementChild.setAttribute("transform", "scale(1 .4)")
		}
		exit("toMill", "Down to the rain mill", 10, 87, "Mill", -1)
	},
	Mill: function() {
		// The race arrives from the sluice on the right and passes under the wheel.
		$("MillWater").style.color = state.water ? "#82afb3" : "#7a8076"
		$("MillCurrent").style.visibility = state.water ? "visible" : "hidden"
		set("MillScene", 0, 0)
		const wheel = set("Wheel", 108, 55, 1.2)
		if (state.water) {
			wheel.firstElementChild.classList.add("turn")
		}
		set("Iris", 23, 51, .9, "Talk to Iris, the old keeper", talkIris)
		protagonist(51, 58)
		hotspot("workshop", "Enter the keeper's workshop", 64, 46, 16, 26, () => show("Workshop"))
		exit("palace", "Back to the palace", 12, 52, "Court", -1)
		exit("meadow", "Follow the hoofprints", 12, 89, "Meadow", -1)
		exit("sluice", "Along the spillway", 148, 78, "Sluice")
	},
	Meadow: function() {
		set("MeadowScene", 0, 0)
		if (!state.taken.includes("Key")) {
			set("Key", 149, 35, .22)
		}
		set("Bird", 142, 31, .45, "A magpie guarding something brass", talkBird)
		set("Unicorn", 74, 45, 1, "Talk to the unicorn", talkUnicorn)
		if (!state.free) {
			// Individual links keep the iron chain visible against the grass.
			set("Chain", 0, 0)
			hotspot("shackle", "The iron shackle", 92, 77, 10, 9, () => say("Nell", "Locked. The keyhole is brass. So is that thing in the magpie's nest."))
		}
		protagonist(43, 57)
		exit("mill", "Back to the mill", 10, 84, "Mill", -1)
	},
	Workshop: function() {
		set("WorkshopScene", 0, 0)
		set("Bench", 88, 58)
		hotspot("diagram", "Read the rainbow diagram", 91, 22, 40, 29, readDiagram)
		if (!state.taken.includes("Oil")) {
			set("Oil", 102, 50, .45, "Take the oil can", () => take("Oil", "It says: FOR STUBBORN MACHINERY. Pity it doesn't work on ministers."))
		}
		if (!state.taken.includes("Spanner")) {
			set("Spanner", 126, 56, .38, "Take the spanner", () => take("Spanner", "A spanner. Finally, a tool I was actually trained to use.")).firstElementChild.setAttribute("transform", "translate(0 8) scale(1 .5) rotate(60 10 15)")
		}
		protagonist(60, 53, .9)
		exit("outside", "Outside to Iris", 10, 87, "Mill", -1)
	},
	Sluice: function() {
		// A frontal gate separates two dry banks; its channel leads toward the mill.
		$("GatePanel").setAttribute("transform", `translate(0 ${state.water ? 26 : 46})`)
		$("SluiceWater").style.visibility = state.water ? "visible" : "hidden"
		set("SluiceScene", 0, 0)
		set("Crank", 51, 54, 1, "The sluice handwheel", turnSluice)
		if (state.water) {
			set("Spanner", 46.5, 52.2, .45, "The spanner holding the sluice open", turnSluice)
		}
		// The footbridge keeps the maintenance entrance reachable after the gate opens.
		hotspot("passage", "Enter the maintenance passage", 124, 44, 20, 28, () => show("Engine"))
		protagonist(25, 48, .8)
		exit("mill", "Back to the mill", 10, 87, "Mill", -1)
		exit("engine", "The maintenance passage", 120, 60, "Engine")
	},
	Engine: function() {
		$("ReleaseCord").style.visibility = state.cord ? "visible" : "hidden"
		$("BrokenReleaseCord").style.visibility = state.cord ? "hidden" : "visible"
		set("EngineScene", 0, 0)
		hotspot("tank", "Look through the glass tank", 73, 46, 30, 21, discover)
		set("Bench", 40, 62, .35)
		if (!state.taken.includes("Ledger")) {
			set("Ledger", 44, 55, .36, "Read the sales ledger", () => {
				state.truth = true
				take("Ledger", "Every missing rainbow. Bottled and sold. And every payment signed: Minister Dullworth.")
			})
		}
		hotspot("lever", "Pull the release lever", 124, 45, 16, 26, release)
		hotspot("ladder", "Climb to the rainbow lantern", 140, 8, 17, 78, () => show("Roof"))
		protagonist(25, 55, .83)
		exit("spillway", "Back to the spillway", 10, 86, "Sluice", -1)
	},
	Roof: function() {
		$("Sunbeam").style.visibility = state.mounted ? "visible" : "hidden"
		set("RoofScene", 0, 0)
		if (state.mounted) {
			set("Prism", 72, 26, .8, "The prism in its cradle", () => say("Nell", aligned() ? "Light. Rain. Horn. The lantern is ready." : "The prism is back. Now to open the shutters in the right order."))
		} else {
			hotspot("cradle", "An empty triangular cradle", 70, 26, 28, 22, () => say("Nell", "A triangular cradle. About the size of a certain royal paperweight."))
		}
		for (let i = 0; i < 3; ++i) {
			const x = 69 + i * 15,
				symbol = set(["Sun", "Drop", "Horn"][state.shutters[i]], x, 60, .48),
				name = () => `Shutter ${i + 1}: ${["Light", "Rain", "Horn"][state.shutters[i]]}. Click to turn.`
			hotspot("dial" + i, name(), x - 5.5, 54.5, 11, 11, () => {
				state.shutters[i] = (state.shutters[i] + 1) % 3
				symbol.firstElementChild.setAttribute("href", "#" + ["Sun", "Drop", "Horn"][state.shutters[i]])
				actions["dial" + i].name = name()
				anchors["dial" + i].setAttribute("aria-label", name())
				info(aligned() ? "Light → Rain → Horn. The shutters line up." : "Turn the shutters. The workshop diagram showed the order.")
			})
		}
		protagonist(43, 51, .8)
		exit("down", "Down to the engine", 16, 81, "Engine", -1)
	},
	Bridge: function() {
		set("BridgeScene", 0, 0)
		set("Unicorn", 26, 40, .9, "Cross the rainbow with Morrow", finish).firstElementChild.setAttribute("transform", "translate(56 0) scale(-1 1)")
		protagonist(6, 50)
		hotspot("cross", "Cross the rainbow with Morrow", 72, 30, 76, 49, finish)
	},
	End: function() {
		scenes.Court()
		world.querySelectorAll('[role="button"]').forEach(e => {
			e.removeAttribute("role")
			e.removeAttribute("tabindex")
			delete e.dataset.action
		})
		set("Rain", 0, 0)
	}
}

function talkDullworth() {
	if (state.prism) {
		say("Dullworth", "You have your paperweight. Bring me the horn by sunset.", "Nell", "I'll see what I can arrange.")
	} else if (state.truth) {
		say("Nell", "The rainbow didn't vanish. You bottled it.", "Dullworth", "Stored. For the nation's future.", "Nell", "At six gold pieces a bottle?", "Dullworth", "A very expensive future. Do you have any evidence?")
	} else {
		choose("Dullworth", [
			["Why do you need a unicorn's horn?", () => say("Dullworth", "The old books say you need a horn to make a rainbow.", "Nell", "Does the rest of the unicorn have to come off?", "Dullworth", "You're the weather keeper. Use your initiative.")],
			["What happened to the old keeper?", () => say("Dullworth", "Iris? She objected to my sunshine policy. I gave her a permanent holiday.", "Nell", "She still lives at the mill.", "Dullworth", "A very local holiday.")],
			["I'll get back to work.", closeDialog]
		])
	}
}

function talkIris() {
	choose("Iris", [
		["The minister wants the unicorn's horn.", () => say("Iris", "Of course he does. When a clock stops, he asks for the hands.", "Nell", "Can a horn really make a rainbow?", "Iris", "On a living unicorn. They carry the rain across the sky. No rainbow, no way home.", "Nell", "There's one down in the meadow.", "Iris", "Then someone has left it a long way from home.")],
		state.water ? null : ["Why isn't the mill turning?", () => say("Iris", "Dullworth closed the sluice. Said people prefer sunshine.", "Nell", "People also prefer food.", "Iris", "My tools are in the workshop. Oil the rust first, then use the spanner on the small sluice handwheel. The maintenance passage is beside it.")],
		[state.truth ? "He has been selling the rainbows." : "How does the lantern work?", () => state.truth
			? say("Iris", "So that's what he meant by liquid assets.", "Nell", "Can we put them back?", "Iris", "Water to turn the mill. A prism in the lantern. Light, then rain, then a living horn. And pull the release, hard.")
			: readDiagram("Iris")],
		["I'll have a look around.", closeDialog]
	])
}

function talkBird() {
	if (state.taken.includes("Key")) {
		say("Nell", "Enjoying your new status?", "Bird", "Kraa!", "Nell", "Minister of shiny things. Already better qualified.")
	} else {
		say("Nell", "May I have that key?", "Bird", "Kraa!", "Nell", "All right. An exchange. Something shinier than brass…")
	}
}

function talkUnicorn() {
	if (!state.free) {
		say("Nell", "Hello. I've been sent for your horn.", "Unicorn", "…", "Nell", "Not a great opening. Sorry.", "Nell", "That iron shackle looks painful. I'll start there.")
	} else if (!state.fed) {
		say("Nell", "You're free. You can go.", "Unicorn", "…", "Nell", "Or you could eat first. You look like I feel at the end of a shift.")
	} else if (state.truth && !state.hair) {
		state.hair = true
		give("Hair")
		say("Nell", "I found the rainbow. Dullworth has it in a tank under the mill.", "Unicorn", "Then open it.", "Nell", "There's a release lever. Its cord has snapped.", "Unicorn", "Take a hair from my tail. One held up the northern lights for a winter.", "Nell", "That's a lot of responsibility for a hair.", "Unicorn", "It had help.", () => render())
	} else {
		choose("Morrow", [
			["You can talk?", () => say("Unicorn", "So can you. I was being polite about it.", "Nell", "I'm Nell.", "Unicorn", "Morrow. Last keeper of the western rain.")],
			["Why haven't you gone home?", () => say("Unicorn", "Rainbows are bridges. Dullworth took the last one, then chained me here.", "Nell", "And blamed you for eating it.", "Unicorn", "I eat grass. Occasionally a biscuit. The sky gives me wind.")],
			[state.truth ? "Will you come to the lantern?" : "How can I help?", () => state.truth
				? say("Unicorn", "Open the rainbow. I will come when I hear the mill.", "Nell", "Promise?", "Unicorn", "You took the iron off. That was enough.")
				: say("Unicorn", "Find where he put the rainbow. Follow the water. Or where the water ought to be.")],
			["See you soon.", closeDialog]
		])
	}
}

function readDiagram(speaker = "Nell") {
	say(speaker, "A rainbow begins with LIGHT, passes through RAIN, and finds its way through a HORN. The three shutters go in that order, left to right.", speaker, speaker == "Iris" ? "The horn must remain attached to its owner. I underlined that twice." : "Underneath: the horn must remain attached to its owner. Someone underlined that twice.")
}

function turnSluice() {
	if (state.water) {
		say("Nell", "The sluice is open. Water is turning the mill again.")
	} else {
		say("Nell", state.oiled ? "The rust is loose. I need some leverage on that square axle." : "It won't move. Rust has promoted itself to a structural component.")
	}
}

function discover() {
	state.truth = true
	say("Nell", "There it is. A whole rainbow, squeezed into a tank.", "Nell", "And a tap for filling little bottles. The unicorn didn't steal the rainbow. The minister did.")
}

function aligned() {
	return state.shutters.every((value, i) => value == i)
}

function release() {
	if (!state.cord) {
		say("Nell", "The lever isn't connected. The control cord has snapped. I need a strong, thin replacement.")
	} else if (!state.water) {
		say("Nell", "The mill isn't turning. I need to open the sluice outside.")
	} else if (!state.mounted) {
		say("Nell", "The cord holds, but there's no light in the lantern. Something is missing upstairs.")
	} else if (!aligned()) {
		say("Nell", "A faint glow, then nothing. The three shutters upstairs need to follow the workshop diagram.")
	} else {
		say("Nell", "Here goes my career.", "Nell", "And hopefully the rainbow.", () => {
			state.bridge = true
			show("Bridge")
			say("Unicorn", "You found the way.", "Nell", "Technically, I voided three royal orders and a warranty.", "Unicorn", "Come. There is something you should see.")
		})
	}
}

function finish() {
	say("Nell", "Will it hold us?", "Unicorn", "It holds the rain. You weigh considerably less.", "Nell", "That is almost reassuring.", () => {
		state.inventory = []
		state.ended = true
		show("End")
		say("Dullworth", "WHERE IS MY HORN?", "Nell", "Still attached to the unicorn. The old book was very specific.", "Dullworth", "My sunshine! My terrace! My shoes!", "Nell", "The farms send their regards.", "Dullworth", "You're dismissed. Permanently!", "Nell", "Good. I have a bridge to cross.", () => {
			$("menu").innerHTML = '<div class="eyebrow">Unicorns and rainbows</div><h2>The rain came home.</h2><p>So did Morrow.<br>Nell took a very permanent holiday.<br>Iris went back to work.<br>The minister bought an umbrella.</p><p>THE END · Thanks for playing.</p><button class="primary" id="again">Play again</button>'
			$("menu").hidden = false
			$("again").onclick = newGame
		})
	})
}

function give(id) {
	if (!state.inventory.includes(id)) {
		state.inventory.push(id)
	}
	if (!state.taken.includes(id)) {
		state.taken.push(id)
	}
	inventory()
}

function consume(id) {
	state.inventory = state.inventory.filter(item => item != id)
	inventory()
}

function take(id, message) {
	give(id)
	render()
	say("Nell", message)
}

function use(id) {
	const here = state.scene
	if (id == "Order" && here == "Meadow" && !state.taken.includes("Key")) {
		consume(id)
		give("Key")
		render()
		say("Nell", "One royal order. With a genuine gold seal.", "Bird", "Kraa!", "Nell", "Keep the paperwork. I'll take the key.")
	} else if (id == "Order") {
		say("Nell", "BRING ME THE HORN OF THE LAST UNICORN. Signed: Dullworth. The seal looks like real gold. Of course it does.")
	} else if (id == "Key" && here == "Meadow") {
		state.free = true
		consume(id)
		render()
		say("Nell", "There. That comes off. Your horn stays on.", "Unicorn", "…", "Nell", "You're welcome. I think.")
	} else if (id == "Biscuit" && here == "Meadow") {
		if (!state.free) {
			say("Nell", "It won't come near me with that shackle on. Freedom first. Snacks second.")
		} else {
			state.fed = true
			consume(id)
			say("Unicorn", "A little dry.", "Nell", "YOU CAN TALK?", "Unicorn", "And you can shout. I preferred the biscuit.")
		}
	} else if (id == "Oil" && here == "Sluice") {
		state.oiled = true
		consume(id)
		say("Nell", "The rust gives in. Now for something to turn the axle.")
	} else if (id == "Spanner" && here == "Sluice") {
		if (!state.oiled) {
			say("Nell", "Too stiff. I'll break the axle. Iris said to oil it first.")
		} else if (!state.water) {
			state.water = true
			consume(id)
			render()
			say("Nell", "There! I'll leave the spanner wedged here to keep it open.", "Nell", "Listen. The mill is turning again.")
		}
	} else if (id == "Ledger" && here == "Court") {
		consume(id)
		state.prism = true
		give("Prism")
		render()
		say("Nell", "Your ledger. Every rainbow, every payment. Shall I read it in the market?", "Dullworth", "Give me that.", "Nell", "Give me the prism.", "Dullworth", "Fine. A worthless paperweight. It won't work without a horn.", "Nell", "So you've said.")
	} else if (id == "Ledger") {
		say("Nell", "RAINBOW RESERVE. Six gold pieces per bottle. All signed by Dullworth. He ought to see this.")
	} else if (id == "Hair" && here == "Engine") {
		state.cord = true
		consume(id)
		render()
		say("Nell", "One unicorn hair, from the lever to the release valve. It holds. My hair just clogs the drain.")
	} else if (id == "Prism" && here == "Roof") {
		state.mounted = true
		consume(id)
		render()
		say("Nell", "A perfect fit. It was never a paperweight.")
	} else {
		const clues = {
			Biscuit: "I'll save it for someone hungry. Preferably someone with better teeth.",
			Key: "A brass key. It should fit the unicorn's shackle.",
			Oil: "Oil for the rusty sluice handwheel. The workshop is already slippery enough.",
			Spanner: "Just the right size for the square axle at the sluice.",
			Hair: "Stronger than rope, thinner than thread. Just right for a broken control cord.",
			Prism: "This belongs in the lantern on top of the mill."
		}
		say("Nell", clues[id] || "I can't use that here.")
	}
}

function hintText() {
	if (!state.free) {
		return state.inventory.includes("Key") ? "Use the brass key in the meadow." : "The magpie likes shiny things. My royal order has a gold seal."
	} else if (!state.fed) {
		return state.inventory.includes("Biscuit") ? "Offer the hungry unicorn a biscuit." : "There was a biscuit on the little table at the palace."
	} else if (!state.truth) {
		return "Look inside the tank beneath the mill. The passage is by the spillway."
	} else if (!state.hair) {
		return "Tell the unicorn about the stolen rainbow and the broken cord."
	} else if (!state.cord) {
		return "Use the unicorn hair on the engine's broken cord."
	} else if (!state.prism) {
		return state.inventory.includes("Ledger") ? "Show Dullworth his ledger. Trade it for the prism." : "Take the ledger from beneath the mill."
	} else if (!state.mounted) {
		return "Put the prism in the cradle on the roof."
	} else if (!aligned()) {
		return "Set the shutters to LIGHT, RAIN, HORN, from left to right."
	} else if (!state.water) {
		return !state.oiled ? "Use the workshop's oil can on the sluice handwheel, then the spanner." : "Use the spanner at the oiled sluice."
	} else if (!state.bridge) {
		return "Pull the release lever beneath the mill."
	}
	return "Cross the rainbow with Morrow."
}

function inventory() {
	$("inventory").replaceChildren()
	for (const id of state.inventory) {
		const button = document.createElement("button")
		button.setAttribute("aria-label", "Use " + itemNames[id])
		button.title = itemNames[id]
		button.innerHTML = `<svg viewBox="-4 -3 38 38" aria-hidden="true"><use href="#${id}"/></svg>`
		button.onclick = () => {
			if (!bubble.hidden || !$("menu").hidden) {
				return
			}
			use(id)
		}
		button.onpointerenter = button.onfocus = () => info("Use " + itemNames[id])
		$("inventory").appendChild(button)
	}
}

function info(text = "Explore the scene. Click to interact.") {
	$("info").textContent = text
}

function render() {
	world.replaceChildren()
	actions = {}
	anchors = {}
	scenes[state.scene]()
	$("location").textContent = sceneNames[state.scene]
	inventory()
}

function show(name) {
	closeDialog()
	state.scene = name
	render()
	info()
}

function say(...lines) {
	conversation = lines
	afterDialog = typeof lines[lines.length - 1] == "function" ? conversation.pop() : null
	choosing = false
	$("choices").replaceChildren()
	nextLine()
}

function nextLine() {
	if (choosing) {
		return
	}
	if (!conversation.length) {
		const done = afterDialog
		afterDialog = null
		closeDialog()
		if (done) {
			done()
		}
		return
	}
	currentSpeaker = conversation.shift()
	$("speaker").textContent = currentSpeaker == "Unicorn" ? (state.fed ? "Morrow" : "The unicorn") : currentSpeaker == "Bird" ? "The magpie" : currentSpeaker
	$("words").textContent = conversation.shift()
	$("next").hidden = false
	bubble.hidden = false
	positionBubble()
}

function choose(who, options) {
	conversation = []
	afterDialog = null
	choosing = true
	currentSpeaker = who == "Morrow" ? "Unicorn" : who
	$("speaker").textContent = who
	$("words").textContent = ""
	$("next").hidden = true
	$("choices").replaceChildren()
	for (const [text, action] of options.filter(option => option != null)) {
		const button = document.createElement("button")
		button.textContent = "› " + text
		button.onclick = event => {
			event.stopPropagation()
			closeDialog()
			action()
		}
		$("choices").appendChild(button)
	}
	bubble.hidden = false
	positionBubble()
}

function positionBubble() {
	if (bubble.hidden) {
		return
	}
	const frame = $("frame").getBoundingClientRect(),
		actor = anchors[currentSpeaker] || anchors.Nell,
		box = actor ? actor.getBoundingClientRect() : frame,
		center = box.x + box.width / 2 - frame.x,
		width = bubble.offsetWidth,
		height = bubble.offsetHeight,
		x = Math.max(8, Math.min(frame.width - width - 8, center - width / 2)),
		y = Math.max(frame.height * .12, box.y - frame.y - height - 16)
	bubble.style.left = x + "px"
	bubble.style.top = y + "px"
	bubble.style.setProperty("--tail", Math.max(12, Math.min(width - 18, center - x)) + "px")
}

function closeDialog() {
	bubble.hidden = true
	choosing = false
	conversation = []
	afterDialog = null
}

function interact(id) {
	if (!$("cover").hidden || !$("menu").hidden) {
		return
	}
	if (!bubble.hidden) {
		nextLine()
	} else if (actions[id]) {
		actions[id].action()
	}
}

function targetAt(event) {
	return document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-action]")
}

stage.onpointermove = stage.onpointerdown = event => {
	if (bubble.hidden) {
		const target = targetAt(event)
		info(target ? actions[target.dataset.action]?.name : undefined)
	}
}
stage.onpointerup = event => {
	if (event.pointerType != "mouse") {
		touchTime = Date.now()
		touchTarget = targetAt(event)?.dataset.action
	}
}
stage.onclick = event => {
	// Act on the click, after touch release, so a newly opened dialog cannot
	// receive the same tap as a second click.
	const id = Date.now() - touchTime < 500 ? touchTarget : event.target.closest("[data-action]")?.dataset.action
	touchTime = 0
	interact(id)
}
stage.onpointerleave = () => info()
bubble.onclick = () => nextLine()
window.onresize = positionBubble

function help() {
	if (!$("menu").hidden || !$("cover").hidden) {
		return
	}
	$("menu").innerHTML = '<h2>A little help?</h2><p>Click people and objects. Click inventory items to use them here.</p><p>Click / Space: next line. Tab / Enter: select.<br>Touch: slide to explore, lift to interact.</p><button class="primary" id="back">Back to the adventure</button><button class="primary secondary" id="hint">A gentle nudge</button>'
	$("menu").hidden = false
	$("back").onclick = () => { $("menu").hidden = true }
	$("hint").onclick = () => {
		$("menu").hidden = true
		// Leave an ongoing conversation intact, including its completion callback.
		if (!bubble.hidden) {
			info("Finish this conversation first; then ask Nell for a hint.")
		} else {
			say("Nell", hintText())
		}
	}

}

function newGame() {
	state = freshState()
	$("menu").hidden = true
	$("cover").hidden = true
	show("Court")
	stage.setAttribute("tabindex", "-1")
	stage.focus()
	say("Dullworth", "Ah. The new weather keeper.", "Nell", "Junior weather keeper. Mostly gutters.", "Dullworth", "The last rainbow has vanished. The fields are dry. People are beginning to complain.", "Nell", "About the drought?", "Dullworth", "About me. Much more serious.", "Dullworth", "There's a unicorn below the old mill. Bring me its horn. We'll have the rainbow back by sunset.", "Nell", "Does the unicorn know about this?", "Dullworth", "Take this royal order. It explains everything.", () => {
		give("Order")
		info("Visit Iris at the old mill. The path is on the left.")
	})
}

$("help").onclick = help
$("start").onclick = newGame
window.addEventListener("keydown", event => {
	if (!$("cover").hidden) {
		return
	}
	if (event.key == "Escape" && !$("menu").hidden && !state.ended) {
		$("menu").hidden = true
	} else if (!$("menu").hidden) {
		return

	} else if (event.key == " " && !bubble.hidden && !choosing) {
		event.preventDefault()
		nextLine()
	}
})
// The title uses the same SVG scene as the game; there are no image assets.
state.scene = "Meadow"
render()
$("hud").style.visibility = "hidden"
$("footer").style.visibility = "hidden"
$("cover").addEventListener("click", () => {
	if ($("cover").hidden) {
		$("hud").style.visibility = "visible"
		$("footer").style.visibility = "visible"
	}
})
