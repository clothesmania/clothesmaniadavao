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
  return <div className="fixed inset-0 z-[250] grid place-items-center bg-white p-6 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
    <div role={error ? 'alert' : 'status'} aria-atomic="true" className="w-full max-w-sm text-center">
      <img src="/images/auth-brand.png" alt="Clothes Mania Davao" width="216" height="154" className="mx-auto h-auto w-44 sm:w-48" />
      <div className="mt-6 flex items-center justify-center gap-3">
        {!error && <span aria-hidden="true" className="h-5 w-5 shrink-0 rounded-full border-2 border-amber-100 border-t-amber-600 motion-safe:animate-spin dark:border-slate-800 dark:border-t-amber-400" />}
        <p className="text-sm leading-6">{error || 'Loading your workspace…'}</p>
      </div>
      {error && <button className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-600 dark:bg-slate-100 dark:text-slate-950" onClick={() => window.location.reload()}>Reload</button>}
    </div>
  </div>
}
