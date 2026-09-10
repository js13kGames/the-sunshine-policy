import { readFileSync } from 'node:fs'
import { deflateAsync } from '@gfx/zopfli'

process.stdout.write(await deflateAsync(readFileSync(0), { numiterations: 15 }))
