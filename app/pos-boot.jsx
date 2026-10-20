'use client'

import { useEffect, useState } from 'react'
import { bootPos } from '../lib/boot-pos.mjs'

export default function PosBoot() {
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let active = true
    bootPos().then(() => {
      if (active) setReady(true)
    }).catch(cause => {
      console.error('Could not start the POS.', cause)
      if (active) setError('The app could not start. Reconnect and reload this page. Your saved records have not been replaced.')
    })
    return () => { active = false }
  }, [])
  if (ready) return null
  return <div className="fixed inset-0 z-[250] grid place-items-center bg-white/95 p-6 text-slate-950 backdrop-blur-sm">
    <div role={error ? 'alert' : 'status'} className="max-w-sm text-center">
      <p className="text-lg font-bold">Clothes Mania Davao</p>
      <p className="mt-3 text-sm leading-6">{error || 'Opening your protected workspace…'}</p>
      {error && <button className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={() => window.location.reload()}>Reload</button>}
    </div>
  </div>
}
