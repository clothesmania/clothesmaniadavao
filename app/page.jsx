import { readFile } from 'node:fs/promises'
import path from 'node:path'
import PosBoot from './pos-boot'

// This is a public app shell. Customer records are read only in the browser.
export const dynamic = 'force-static'

export default async function Home() {
  const shell = await readFile(path.join(process.cwd(), 'src/pos/shell.html'), 'utf8')
  return <>
    <div id="pos-root" dangerouslySetInnerHTML={{ __html: shell }} />
    <PosBoot />
    <noscript>Enable JavaScript to open your protected Clothes Mania workspace.</noscript>
  </>
}
