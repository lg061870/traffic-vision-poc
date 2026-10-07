// Copies the analyzed demo clip (video + model results) from data/demo into public/demo, where the
// camera panel loads it. Both stay out of Git (see data/demo/README.md); without them the panel
// says the clip is missing and the rest of the dashboard works.
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const clip = 'la_bus_highlights.mp4'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const demo = join(root, '..', '..', 'data', 'demo')
const target = join(root, 'public', 'demo')

const files = [
  [join(demo, 'videos', clip), join(target, clip)],
  [join(demo, 'results', `${clip}.result.json`), join(target, `${clip}.result.json`)],
]

mkdirSync(target, { recursive: true })
for (const [from, to] of files) {
  if (!existsSync(from)) {
    console.warn(`sync-demo: ${from} not found; the camera panel will show that the clip is missing.`)
    continue
  }
  if (existsSync(to) && statSync(to).mtimeMs >= statSync(from).mtimeMs) continue
  copyFileSync(from, to)
  console.log(`sync-demo: copied ${to}`)
}
