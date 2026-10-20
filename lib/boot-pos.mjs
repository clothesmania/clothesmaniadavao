const scripts = ['/vendor.js', '/workspace-crypto.js', '/pos-runtime.js', '/report-io.js']

export function bootPos(target = window, doc = document) {
  if (target.__clothesManiaBoot) return target.__clothesManiaBoot
  target.__clothesManiaBoot = (async () => {
    for (const src of scripts) {
      await new Promise((resolve, reject) => {
        const script = doc.createElement('script')
        script.src = src
        script.async = false
        script.onload = resolve
        script.onerror = () => reject(new Error(`Could not load ${src}`))
        doc.body.appendChild(script)
      })
    }
    await target.startClothesManiaPos()
  })()
  return target.__clothesManiaBoot
}
