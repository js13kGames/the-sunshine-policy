"use strict"

const $ = id => document.getElementById(id),
	NS = "http://www.w3.org/2000/svg",
	rainbowColors = ["#d77b76", "#dfaa70", "#edd49a", "#92b597", "#83b3c5", "#8995bb", "#a58fad"],
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

function svg(markup) {
	world.insertAdjacentHTML("beforeend", markup)
}

function path(fill, d, extra = "") {
	svg(`<path fill="${fill}" d="${d}" ${extra}/>`)
}

function rect(fill, x, y, w, h, extra = "") {
	svg(`<rect fill="${fill}" x="${x}" y="${y}" width="${w}" height="${h}" ${extra}/>`)
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
	path("#f0ddb0", `M${x} ${y}l${-direction * 2} -1.5v1h${-direction * 4}v1h${direction * 4}v1Z`)
	hotspot(id, name, x - 8, y - 4, 16, 8, () => show(to))
}

function protagonist(x = 46, y = 55, s = .8) {
	set("Nell", x, y, s, "Nell, junior weather keeper", () => say("Nell", hintText()))
}

function sky(night = false) {
	rect(night ? "#30384f" : "#8b9b9a", 0, 0, 160, 100)
	svg(`<circle cx="123" cy="17" r="6" fill="#f0c58c"/>`)
	set("Cloud", 8, 11, .9).firstElementChild.classList.add("drift")
	set("Cloud", 100, 18, 1.2).firstElementChild.classList.add("drift")
	path("#707e86", "M0 50L20 38 34 42 60 26 90 48 118 34 160 52V100H0Z")
	path("#565e6d", "M0 62L28 48 52 56 88 40 122 58 148 48 160 52V100H0Z")
}

function grass(x, y, color = "#ac986e") {
	path(color, `M${x} ${y}l-2 -6 3 4 2 -8v8l4 -3 -3 6Z`)
}

function rainbow(x, y, radius, width = 1.4) {
	rainbowColors.forEach((color, i) => {
		const r = radius - i * width
		path("none", `M${x - r} ${y}a${r} ${r} 0 0 1 ${r * 2} 0`, `stroke="${color}" stroke-width="${width + .08}"`)
	})
}

const scenes = {
	Court: function() {
		sky()
		path("#b6aa8c", "M0 60H160V100H0Z")
		path("#9a8d77", "M0 72L80 64 160 72V100H0Z")
		path("#d3c3a2", "M0 0H20V56H24V62H0Z M140 0H160V62H136V56H140Z")
		path("#b5a385", "M0 0H6V56H20V58H0Z M152 0H160V62H152Z")
		path("#d3c3a2", "M20 50H140V53H20Z")
		for (let x = 28; x < 140; x += 16) {
			rect("#c5b595", x, 53, 3, 10)
		}
		path("#d3c3a2", "M0 62H160V65H0Z")
		path("#81705f", "M106 60L112 64V82L106 78Z")
		path("#c6ad84", "M112 64H132V82H112Z")
		path("#ead5a4", "M106 60H126L132 64H112Z")
		if (!state.prism) {
			set("Prism", 113, 54, .38, "The minister's glass paperweight", () => say("Dullworth", "My paperweight. It keeps the weather reports from blowing away. Such gloomy little reports."))
		}
		set("Dullworth", 84, 43, .95, "Talk to Minister Dullworth", talkDullworth)
		protagonist(49, 54)
		svg('<ellipse cx="31" cy="76" rx="6" ry="1.5" fill="#57575c"/>')
		path("#57575c", "M30 76H32V84L37 86H33L31 85 29 86H25L30 84Z")
		if (!state.taken.includes("Biscuit")) {
			set("Biscuit", 28, 73, .3, "Take the neglected biscuit", () => take("Biscuit", "A royal biscuit. Hard enough to inherit the throne.")).firstElementChild.setAttribute("transform", "scale(1 .4)")
		}
		exit("toMill", "Down to the rain mill", 10, 87, "Mill", -1)
	},
	Mill: function() {
		sky()
		path("#999379", "M0 66L60 53 114 59 160 52V100H0Z")
		path("#b3a07d", "M32 100L64 72H80L68 100Z M0 50L34 58 38 62 0 55Z")
		// The race arrives from the sluice on the right and passes under the wheel.
		path("#495e64", "M160 57L132 66 96 70 80 100H114L126 78 160 68Z")
		path(state.water ? "#82afb3" : "#7a8076", "M160 60L134 69 100 73 86 100H108L121 76 160 65Z")
		path("#8d826e", "M40 28L50 34V72L40 66Z")
		path("#b5a78a", "M50 34L88 12 126 34V72H50Z")
		path("#3b4855", "M38 30L76 8 88 12 50 36Z")
		path("#53626a", "M48 36L88 12 128 36 125 38 88 17 51 38Z")
		path("#37434a", "M64 72V52Q72 42 80 52V72Z")
		rect("#424e53", 88, 34, 7, 10)
		path("#c4b38c", "M90 34H92V44H90Z")
		const wheel = set("Wheel", 108, 60, 1.2)
		if (state.water) {
			wheel.firstElementChild.classList.add("turn")
			path("none", "M160 62L134 71 109 76 96 100", 'stroke="#b5d5cb" stroke-width="1" stroke-dasharray="3 3" class="flow"')
		}
		set("Iris", 27, 48, .9, "Talk to Iris, the old keeper", talkIris)
		protagonist(51, 58)
		grass(13, 90)
		grass(143, 94)
		hotspot("workshop", "Enter the keeper's workshop", 64, 46, 16, 26, () => show("Workshop"))
		exit("palace", "Back to the palace", 12, 52, "Court", -1)
		exit("meadow", "Follow the hoofprints", 12, 89, "Meadow", -1)
		exit("sluice", "Along the spillway", 148, 78, "Sluice")
	},
	Meadow: function() {
		sky(true)
		path("#8d8d74", "M0 72Q44 54 88 64L160 56V100H0Z")
		path("#70765f", "M0 88Q44 72 88 80L160 72V100H0Z")
		path("#b1a184", "M0 88L45 76 42 82 10 100H0Z")
		path("#3f4148", "M136 84L139 68V44L126 30 110 28 108 26H127L121 16 123 14 133 28 142 36 145 24 143 12 145 10 149 24 147 38 156 32H160V35L149 44 146 68 153 84 143 80Z")
		path("#595450", "M142 36L147 38 149 44 146 68 153 84 143 80V68L145 44Z")
		path("#987851", "M141 37Q149 35 157 37L154 41H144Z")
		if (!state.taken.includes("Key")) {
			set("Key", 149, 35, .22)
		}
		set("Bird", 142, 31, .45, "A magpie guarding something brass", talkBird)
		set("Unicorn", 74, 45, 1, "Talk to the unicorn", talkUnicorn)
		if (!state.free) {
			// Individual links keep the iron chain visible against the grass.
			for (let i = 0; i < 11; ++i) {
				const x = 99 + i * 4, y = 80 + Math.sin(i / 10 * Math.PI) * 10 - i * .2,
					angle = Math.atan((Math.cos(i / 10 * Math.PI) * Math.PI - .2) / 4) * 180 / Math.PI
				svg(`<ellipse cx="${x}" cy="${y}" rx="2.4" ry=".9" transform="rotate(${angle} ${x} ${y})" fill="none" stroke="#35434d" stroke-width=".8"/>`)
			}
			path("#485762", "M93 79H97V81H93Z")
			hotspot("shackle", "The iron shackle", 92, 77, 10, 9, () => say("Nell", "Locked. The keyhole is brass. So is that thing in the magpie's nest."))
		}
		protagonist(43, 57)
		grass(67, 88)
		grass(150, 86)
		exit("mill", "Back to the mill", 10, 84, "Mill", -1)
	},
	Workshop: function() {
		rect("#414d53", 0, 0, 160, 100)
		path("#68756e", "M16 0H22V70H16Z M138 0H144V70H138Z M0 12H160V18H0Z")
		path("#354148", "M0 70H160V100H0Z")
		path("#afbaa2", "M28 26H54V50H28Z")
		path("#87988c", "M28 46L40 34 54 46V50H28Z")
		path("#46565a", "M40 26H42V50H40Z M28 36H54V38H28Z")
		set("Bench", 88, 58)
		path("#a49e83", "M92 26H132V46H92Z")
		set("Sun", 100, 35, .65)
		set("Drop", 111, 35, .65)
		set("Horn", 123, 35, .65)
		hotspot("diagram", "Read the rainbow diagram", 91, 22, 40, 29, readDiagram)
		if (!state.taken.includes("Oil")) {
			set("Oil", 92, 53, .45, "Take the oil can", () => take("Oil", "It says: FOR STUBBORN MACHINERY. Pity it doesn't work on ministers."))
		}
		if (!state.taken.includes("Spanner")) {
			set("Spanner", 126, 55, .38, "Take the spanner", () => take("Spanner", "A spanner. Finally, a tool I was actually trained to use.")).firstElementChild.setAttribute("transform", "translate(0 8) scale(1 .5) rotate(60 10 15)")
		}
		path("#56625c", "M18 62H36L34 76H20Z")
		path("#232f38", "M18 62Q27 58 36 62Q27 66 18 62Z")
		protagonist(60, 53, .9)
		exit("outside", "Outside to Iris", 10, 87, "Mill", -1)
	},
	Sluice: function() {
		sky()
		// A frontal gate separates two dry banks; its channel leads toward the mill.
		rect("#81887b", 0, 30, 160, 42)
		rect("#b6ad8e", 0, 26, 160, 6)
		path("#2d404e", "M64 70H100L120 100H44Z")
		path("#a4a082", "M0 68H64L44 100H0Z M100 68H160V100H120Z")
		path("#777d70", "M64 68L68 72 50 100H44Z M96 72L100 68 120 100H114Z")
		rect("#273c46", 68, 46, 28, 26)
		path("#4b5d64", "M64 24H100V28H64Z M66 28H69V72H66Z M95 28H98V72H95Z")
		const gateTop = state.water ? 26 : 46
		rect("#697975", 69, gateTop, 26, 26)
		for (let x = 74; x < 95; x += 7) {
			rect("#34434b", x, gateTop, 1, 26)
		}
		path("#a4a082", "M69 28H95V34H69Z")
		path("none", "M51 74V54H66", 'stroke="#485b5d" stroke-width="2"')
		set("Crank", 51, 54, 1, "The sluice handwheel", turnSluice)
		if (state.water) {
			path("#80b1b7", "M70 70H94L110 100H54Z")
			path("none", "M74 74L62 100M82 74V100M90 74L102 100", 'stroke="#c9ddc7" stroke-dasharray="4 2" stroke-width="1" class="flow"')
			set("Spanner", 46.5, 52.2, .45, "The spanner holding the sluice open", turnSluice)
		}
		// The footbridge keeps the maintenance entrance reachable after the gate opens.
		path("#777d70", "M50 84H112V86H50Z")
		path("#b6ad8e", "M54 80H108L112 84H50Z")
		path("#3d4a4e", "M124 72V50Q134 36 144 50V72Z")
		path("#b6ad8e", "M120 72H148V75H120Z")
		hotspot("passage", "Enter the maintenance passage", 124, 44, 20, 28, () => show("Engine"))
		protagonist(25, 48, .8)
		exit("mill", "Back to the mill", 10, 87, "Mill", -1)
		exit("engine", "The maintenance passage", 135, 70, "Engine")
	},
	Engine: function() {
		rect("#293846", 0, 0, 160, 100)
		path("#354752", "M10 0H16V76H10Z M146 0H152V76H146Z M0 18H160V24H0Z")
		path("#354148", "M0 64H160V100H0Z")
		path("#876d58", "M56 18H62V56H68V62H56Z M126 66H134V86H126Z")
		path("#6e8987", "M68 42H108V74H68Z")
		path("#4c676a", "M108 42L120 34V66L108 74Z")
		path("#a0b7a2", "M68 42L80 34H120L108 42Z")
		path("#202f40", "M74 48H102V66H74Z")
		rainbowColors.forEach((c, i) => {
			path(c, `M${76 + i * 3.5} 50v14h2.5V50Z`)
		})
		hotspot("tank", "Look through the glass tank", 73, 46, 30, 21, discover)
		set("Bench", 40, 62, .35)
		if (!state.taken.includes("Ledger")) {
			set("Ledger", 44, 55, .36, "Read the sales ledger", () => {
				state.truth = true
				take("Ledger", "Every missing rainbow. Bottled and sold. And every payment signed: Minister Dullworth.")
			})
		}
		path("#ae865c", "M128 68L135 50H137L132 68Z")
		svg('<circle cx="136" cy="49" r="2.5" fill="#bf7757"/>')
		path("none", state.cord ? "M120 50L136 49" : "M120 50L125 54M136 49L131 53", `stroke="${state.cord ? "#e1dec1" : "#a49173"}" stroke-width=".7"`)
		hotspot("lever", "Pull the release lever", 124, 45, 16, 26, release)
		rect("#1b2935", 140, 0, 18, 12)
		path("#4c6267", "M144 86V8H146V86Z M154 86V8H156V86Z")
		for (let y = 14; y < 86; y += 8) {
			rect("#6e8580", 144, y, 10, 1)
		}
		hotspot("ladder", "Climb to the rainbow lantern", 140, 8, 17, 78, () => show("Roof"))
		protagonist(25, 55, .83)
		exit("spillway", "Back to the spillway", 10, 86, "Sluice", -1)
	},
	Roof: function() {
		sky()
		path("#646c70", "M0 72L36 56H124L160 72V100H0Z")
		path("#969782", "M18 90H142V94H18Z")
		path("#b8b396", "M18 70L36 62H124L142 70V90H18Z")
		path("#7e8278", "M60 48H108V74H60Z")
		path("#d1c5a0", "M57 44H111V48H57Z")
		path("#465660", "M60 44V22H63V44Z M105 44V22H108V44Z")
		path("#65777b", "M54 22L84 10 114 22Z")
		path("#bca777", "M70 44L84 38 98 44Z")
		if (state.mounted) {
			path("#f6dda277", "M123 17L84 30 84 34Z")
			set("Prism", 72, 24, .8, "The prism in its cradle", () => say("Nell", aligned() ? "Light. Rain. Horn. The lantern is ready." : "The prism is back. Now to open the shutters in the right order."))
		} else {
			hotspot("cradle", "An empty triangular cradle", 70, 26, 28, 22, () => say("Nell", "A triangular cradle. About the size of a certain royal paperweight."))
		}
		for (let i = 0; i < 3; ++i) {
			const x = 69 + i * 15
			svg(`<circle cx="${x}" cy="60" r="5.5" fill="#354955" stroke="#c5ae80" stroke-width=".7"/>`)
			set(["Sun", "Drop", "Horn"][state.shutters[i]], x, 60, .48)
			hotspot("dial" + i, `Shutter ${i + 1}: ${["Light", "Rain", "Horn"][state.shutters[i]]}. Click to turn.`, x - 5.5, 54.5, 11, 11, () => {
				state.shutters[i] = (state.shutters[i] + 1) % 3
				show("Roof")
				info(aligned() ? "Light → Rain → Horn. The shutters line up." : "Turn the shutters. The workshop diagram showed the order.")
			})
		}
		path("#293846", "M28 84L34 78H48L42 84Z")
		path("#6e8580", "M30 84L35 79H36L31 84Z M40 84L45 79H46L41 84Z M32 82H42L41 83H31Z M34 80H44L43 81H33Z")
		protagonist(43, 51, .8)
		exit("down", "Down to the engine", 38, 81, "Engine", -1)
	},
	Bridge: function() {
		sky()
		path("#333f4a", "M0 78H88L82 100H0Z M134 78L160 70V100H128Z")
		path("#6a806e", "M0 68L32 62 88 78 82 84 0 92Z M134 78L154 68 160 70V88L128 94Z")
		path("#929981", "M0 68L32 62 88 78 82 81 32 67 0 76Z")
		rainbow(110, 78, 38, 1.5)
		set("Unicorn", 26, 40, .9, "Cross the rainbow with Morrow", finish).firstElementChild.setAttribute("transform", "translate(56 0) scale(-1 1)")
		protagonist(6, 56)
		hotspot("cross", "Cross the rainbow with Morrow", 72, 30, 76, 49, finish)
	},
	End: function() {
		scenes.Court()
		world.querySelectorAll('[role="button"]').forEach(e => {
			e.removeAttribute("role")
			e.removeAttribute("tabindex")
			delete e.dataset.action
		})
		for (let i = 0; i < 60; ++i) {
			const x = (i * 37) % 164, y = (i * 19) % 92
			path("none", `M${x} ${y}l-1 3`, 'stroke="#c9d9d399" stroke-width=".35" class="rain"')
		}
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
		["Why isn't the mill turning?", () => say("Iris", "Dullworth closed the sluice. Said people prefer sunshine.", "Nell", "People also prefer food.", "Iris", "My tools are in the workshop. Oil the rust first, then use the spanner on the small sluice handwheel. The maintenance passage is beside it.")],
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
	stage.classList.remove("reveal")
	$("hotspots").setAttribute("aria-pressed", "false")
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
	for (const [text, action] of options) {
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

function toggleHotspots() {
	const shown = stage.classList.toggle("reveal")
	$("hotspots").setAttribute("aria-pressed", String(shown))
}

function help() {
	if (!$("menu").hidden || !$("cover").hidden) {
		return
	}
	$("menu").innerHTML = '<h2>A little help?</h2><p>Click people and objects. Click inventory items to use them here.</p><p>Click / Space: next line. H: hotspots. Tab / Enter: select.<br>Touch: slide to explore, lift to interact.</p><button class="primary" id="back">Back to the adventure</button><button class="primary secondary" id="hint">A gentle nudge</button><button class="primary secondary" id="restart">Start over</button>'
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
	$("restart").onclick = () => {
		$("menu").innerHTML = '<h2>Start a new adventure?</h2><p>This starts the story from the beginning.</p><button class="primary" id="yes">Start over</button><button class="primary secondary" id="no">Keep playing</button>'
		$("yes").onclick = newGame
		$("no").onclick = () => { $("menu").hidden = true }
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

$("hotspots").onclick = toggleHotspots
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
	} else if (event.key.toLowerCase() == "h") {
		toggleHotspots()
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
