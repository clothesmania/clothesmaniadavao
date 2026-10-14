import { useCallback, useEffect, useMemo, useState } from 'react'
import Logo from '../public/logo.svg'
import { resolveLocalAuthState } from './lib/auth-state'
import { addOrderPayment, bindLocalWorkspaceToUser, cancelOrder, createOrder, getFinancialSummary, getInventorySummary, getSyncSummary, importLegacySnapshot, listAuditLogs, listOrderDetails, listProducts, localDb, previewLegacyMigration, receiveStock, recordOrderRefund, saveProduct, unwrapLegacySnapshot } from './lib/local-db'
import { isSupabaseConfigured, supabase, syncPendingChanges } from './lib/supabase-sync'

const money = value => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0))

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 8 9 5 9-5M3 8v9l9 5 9-5V8M12 13v9"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    edit: <><path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    cloud: <><path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 20 11a3.5 3.5 0 0 1-.5 7H7Z"/></>,
    check: <><path d="m5 12 4 4L19 6"/></>,
    close: <><path d="m18 6-12 12M6 6l12 12"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function ProductDialog({ product, initialMode, onClose, onSave, onReceive }) {
  const [mode, setMode] = useState(initialMode || (product ? 'edit' : 'create'))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: product?.name || '', sku: product?.sku || '', category: product?.category || '',
    size: product?.size || '', color: product?.color || '', cost: product?.cost ?? '',
    price: product?.price ?? '', quantity: product?.quantity ?? 0
  })
  const [stock, setStock] = useState({ quantity: '', note: '' })
  const set = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (mode === 'receive') await onReceive(product.id, Number(stock.quantity), stock.note)
      else await onSave(form, product?.id || null)
      onClose()
    } catch (exception) {
      setError(exception.message || 'Could not save this change.')
    } finally {
      setSaving(false)
    }
  }

  const title = mode === 'receive' ? 'Receive stock' : product ? 'Edit product' : 'Add product'
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section aria-labelledby="product-dialog-title" aria-modal="true" role="dialog" className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <header className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
        <div><h2 id="product-dialog-title" className="text-lg font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">Changes save on this device first.</p></div>
        <button className="icon-button" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
      </header>
      {mode === 'receive' ? <form onSubmit={submit} className="space-y-4 px-6 py-5">
        <div className="rounded-xl bg-slate-50 px-4 py-3"><p className="font-semibold text-slate-900">{product.name}</p><p className="mt-1 text-xs text-slate-500">Current stock: {product.quantity} units</p></div>
        <label className="field-label">Quantity received<input className="field-input" type="number" min="1" step="1" required value={stock.quantity} onChange={event => setStock({ ...stock, quantity: event.target.value })} /></label>
        <label className="field-label">Note <span className="font-normal text-slate-400">(optional)</span><input className="field-input" maxLength="120" value={stock.note} onChange={event => setStock({ ...stock, note: event.target.value })} placeholder="Supplier or delivery reference" /></label>
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <footer className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className="button-secondary" onClick={onClose}>Cancel</button><button className="button-primary" disabled={saving}>{saving ? 'Saving…' : 'Receive stock'}</button></footer>
      </form> : <form onSubmit={submit} className="px-6 py-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field-label sm:col-span-2">Product name<input className="field-input" name="name" required maxLength="120" value={form.name} onChange={set} /></label>
          <label className="field-label">SKU<input className="field-input uppercase" name="sku" required maxLength="40" value={form.sku} onChange={set} /></label>
          <label className="field-label">Category<input className="field-input" name="category" maxLength="60" value={form.category} onChange={set} placeholder="Tops, bottoms…" /></label>
          <label className="field-label">Size<input className="field-input" name="size" maxLength="30" value={form.size} onChange={set} placeholder="M, L, One size" /></label>
          <label className="field-label">Color<input className="field-input" name="color" maxLength="40" value={form.color} onChange={set} /></label>
          <label className="field-label">Unit cost (₱)<input className="field-input" name="cost" type="number" min="0" step="0.01" required value={form.cost} onChange={set} /></label>
          <label className="field-label">Retail price (₱)<input className="field-input" name="price" type="number" min="0" step="0.01" required value={form.price} onChange={set} /></label>
          {!product && <label className="field-label sm:col-span-2">Opening stock<input className="field-input" name="quantity" type="number" min="0" step="1" required value={form.quantity} onChange={set} /><span className="mt-1 block font-normal text-slate-500">Opening quantity is recorded as a stock movement.</span></label>}
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <footer className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className="button-secondary" onClick={onClose}>Cancel</button><button className="button-primary" disabled={saving}>{saving ? 'Saving…' : product ? 'Save changes' : 'Add product'}</button></footer>
      </form>}
      {product && mode === 'edit' && <button className="mx-6 mb-5 text-sm font-semibold text-amber-700 hover:text-amber-900" onClick={() => setMode('receive')}>Receive stock instead →</button>}
    </section>
  </div>
}

function AuthScreen({ onSignedIn, notice }) {
  const [mode, setMode] = useState('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [working, setWorking] = useState(false)
  async function submit(event) {
    event.preventDefault()
    setMessage('')
    setWorking(true)
    try {
      const result = mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
      if (result.error) throw result.error
      if (!result.data.session) setMessage('Check your email to confirm the account, then sign in.')
      else await onSignedIn(result.data.session.user)
    } catch (error) {
      setMessage(error.message || 'Could not authenticate. Check your connection and try again.')
    } finally {
      setWorking(false)
    }
  }
  return <main className="grid min-h-screen place-items-center bg-[#f5f5f4] p-5">
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
      <img src={Logo} alt="Clothes Mania Davao" className="mb-8 h-12 w-auto object-contain object-left" />
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{mode === 'sign-in' ? 'Sign in' : 'Create an account'}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">{mode === 'sign-in' ? 'Sign in online once. This device keeps its authorized local workspace available offline.' : 'Each account has a separate workspace. This browser profile stays bound to the first account used with it.'}</p>
      {notice && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{notice}</p>}
      <form onSubmit={submit} className="mt-7 space-y-4">
        <label className="field-label">Email<input className="field-input" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>
        <label className="field-label">Password<input className="field-input" type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength="8" required value={password} onChange={event => setPassword(event.target.value)} /></label>
        {message && <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</p>}
        <button className="button-primary w-full" disabled={working}>{working ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}</button>
      </form>
      <button className="mt-5 w-full text-center text-sm font-semibold text-slate-600 hover:text-amber-800" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setMessage('') }}>
        {mode === 'sign-in' ? 'Create an account' : 'Back to sign in'}
      </button>
    </section>
  </main>
}

function PaymentDialog({ order, onClose, onSave }) {
  const [amount, setAmount] = useState(String(order.balance || ''))
  const [method, setMethod] = useState('Cash')
  const [reference, setReference] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({ amount, method, reference })
      onClose()
    } catch (exception) {
      setError(exception.message || 'Could not save this payment.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section role="dialog" aria-modal="true" aria-labelledby="payment-dialog-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
      <h2 id="payment-dialog-title" className="text-lg font-bold">Record payment</h2>
      <p className="mt-1 text-sm text-slate-500">{order.order.buyer} · Balance {money(order.balance)}</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="field-label">Amount (₱)<input className="field-input" type="number" min="0.01" max={order.balance} step="0.01" required value={amount} onChange={event => setAmount(event.target.value)} /></label>
        <label className="field-label">Payment method<select className="field-input" value={method} onChange={event => setMethod(event.target.value)}><option>Cash</option><option>GCash</option><option>Maya</option><option>Bank transfer</option><option>COD</option><option>Other</option></select></label>
        <label className="field-label">Reference <span className="font-normal text-slate-400">(optional)</span><input className="field-input" maxLength="100" value={reference} onChange={event => setReference(event.target.value)} /></label>
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <footer className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className="button-secondary" onClick={onClose}>Cancel</button><button className="button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save payment'}</button></footer>
      </form>
    </section>
  </div>
}

function App() {
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [summary, setSummary] = useState({ products: 0, units: 0, lowStock: 0, costValue: 0 })
  const [salesSummary, setSalesSummary] = useState({ grossSales: 0, cashCollected: 0, pending: 0, profit: 0, orders: 0 })
  const [syncSummary, setSyncSummary] = useState({ pending: 0, failed: 0, lastSyncedAt: null })
  const [activePage, setActivePage] = useState('products')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [dialogProduct, setDialogProduct] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState('create')
  const [auth, setAuth] = useState({ ready: false, user: null, offline: false })
  const [toast, setToast] = useState('')
  const [authError, setAuthError] = useState('')
  const [migrationPreview, setMigrationPreview] = useState(null)
  const [migrationOpen, setMigrationOpen] = useState(false)
  const [migrationFileName, setMigrationFileName] = useState('')
  const [backupSaved, setBackupSaved] = useState(false)
  const [migrationApproved, setMigrationApproved] = useState(false)
  const [connection, setConnection] = useState(navigator.onLine)
  const [paymentOrder, setPaymentOrder] = useState(null)
  const [orderForm, setOrderForm] = useState({ buyer: '', productId: '', item: '', quantity: '1', unitPrice: '', sessionName: '', seller: '', initialPayment: '0', paymentMethod: 'Cash', paymentReference: '' })

  const refresh = useCallback(async () => {
    const today = new Date()
    const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const todayKey = dateKey(today)
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    const [nextProducts, nextSummary, nextSync, nextOrders, nextAuditLogs, nextSales] = await Promise.all([
      listProducts(), getInventorySummary(), getSyncSummary(), listOrderDetails(), listAuditLogs(),
      getFinancialSummary(dateKey(weekStart), todayKey)
    ])
    setProducts(nextProducts)
    setSummary(nextSummary)
    setSyncSummary(nextSync)
    setOrders(nextOrders)
    setAuditLogs(nextAuditLogs)
    setSalesSummary(nextSales)
  }, [])

  useEffect(() => {
    let active = true
    async function boot() {
      try {
        let user = null
        let offline = false
        if (isSupabaseConfigured) {
          let sessionLookupFailed = false
          let sessionData = null
          try {
            const result = await supabase.auth.getSession()
            sessionData = result.data
            sessionLookupFailed = Boolean(result.error)
          } catch (error) {
            sessionLookupFailed = true
            console.warn('Could not validate the saved online session; checking the authorized local session.', error)
          }
          let cached = null
          user = sessionData?.session?.user || null
          if (user) await localDb.metadata.put({ key: 'lastAuthenticatedUser', userId: user.id, email: user.email })
          if (!user && (!navigator.onLine || sessionLookupFailed)) cached = await localDb.metadata.get('lastAuthenticatedUser')
          const authState = resolveLocalAuthState({ sessionUser: user, cachedUser: cached, online: navigator.onLine && !sessionLookupFailed })
          user = authState.user
          offline = authState.offline
          if (user) await bindLocalWorkspaceToUser(user)
        }
        if (!active) return
        setAuth({ ready: true, user, offline })
        await refresh()
        const preview = await previewLegacyMigration()
        if (active) setMigrationPreview(preview)
      } catch (error) {
        console.error('Local database initialization failed', error)
        if (active) {
          setAuth({ ready: true, user: null, offline: false })
          notify(error.message || 'Local database could not be opened.')
        }
      }
    }
    function notify(message) { if (active) setAuthError(message) }
    boot()
    const online = () => { setConnection(true); if (auth.user) syncNow() }
    const offline = () => setConnection(false)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => { active = false; window.removeEventListener('online', online); window.removeEventListener('offline', offline) }
  }, [refresh])

  useEffect(() => {
    if (toast) {
      const timeout = window.setTimeout(() => setToast(''), 3600)
      return () => window.clearTimeout(timeout)
    }
  }, [toast])

  async function syncNow() {
    if (!isSupabaseConfigured || !connection || !auth.user) return
    try {
      const result = await syncPendingChanges()
      if (result.needsSignIn) {
        setToast('Reconnect and sign in to sync. Your local records remain safe.')
        return
      }
      await refresh()
    } catch (error) {
      console.error('Supabase sync failed', error)
      setToast('Sync paused. Your local changes are safe and will retry when online.')
      await refresh()
    }
  }

  useEffect(() => {
    if (!auth.user || !connection) return
    syncNow()
    const timer = window.setInterval(syncNow, 30000)
    return () => window.clearInterval(timer)
  }, [auth.user?.id, connection])

  async function handleSignIn(user) {
    await bindLocalWorkspaceToUser(user)
    await localDb.metadata.put({ key: 'lastAuthenticatedUser', userId: user.id, email: user.email })
    setAuthError('')
    setAuth({ ready: true, user, offline: false })
    setToast('Signed in. Your device is ready to work offline.')
  }

  async function handleSaveProduct(input, id) {
    await saveProduct({ ...input, actor: auth.user }, id)
    await refresh()
    syncNow()
    setToast(id ? 'Product updated locally.' : 'Product added locally.')
  }

  async function handleReceiveStock(id, quantity, note) {
    await receiveStock(id, quantity, note, auth.user)
    await refresh()
    syncNow()
    setToast('Stock received and recorded locally.')
  }

  async function handleCreateOrder(event) {
    event.preventDefault()
    try {
      const product = products.find(item => item.id === orderForm.productId)
      const createdAt = new Date()
      const orderDate = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}-${String(createdAt.getDate()).padStart(2, '0')}`
      await createOrder({
        ...orderForm,
        actor: auth.user,
        item: product ? product.name : orderForm.item,
        quantity: Number(orderForm.quantity),
        unitPrice: Number(orderForm.unitPrice || product?.price || 0),
        orderDate,
        orderTime: createdAt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
      })
      setOrderForm({ buyer: '', productId: '', item: '', quantity: '1', unitPrice: '', sessionName: '', seller: '', initialPayment: '0', paymentMethod: 'Cash', paymentReference: '' })
      await refresh()
      syncNow()
      setToast('Order saved on this device.')
    } catch (error) {
      setToast(error.message || 'Order was not saved.')
    }
  }

  async function handleSavePayment(input) {
    await addOrderPayment(paymentOrder.order.id, { ...input, actor: auth.user })
    await refresh()
    syncNow()
    setToast('Payment recorded on this device.')
  }

  async function handleCancelOrder(order) {
    const reason = window.prompt('Why is this order being cancelled? (optional)')
    if (reason === null) return
    try {
      await cancelOrder(order.id, reason, auth.user)
      await refresh()
      syncNow()
      setToast('Order cancelled and linked stock restored.')
    } catch (error) {
      setToast(error.message || 'Order was not cancelled.')
    }
  }

  async function handleRefundOrder(order) {
    const amount = window.prompt(`Refund amount (up to ${money(Math.max(0, order.paid - order.refunded))})`)
    if (amount === null) return
    try {
      await recordOrderRefund(order.id, { amount, method: 'Cash', actor: auth.user })
      await refresh()
      syncNow()
      setToast('Refund recorded on this device.')
    } catch (error) {
      setToast(error.message || 'Refund was not recorded.')
    }
  }

  async function handleMigrationPreview() {
    try {
      const preview = await previewLegacyMigration()
      setMigrationPreview(preview)
      setMigrationFileName('')
      setBackupSaved(false)
      setMigrationApproved(false)
      setMigrationOpen(true)
    } catch (error) {
      setToast(error.message || 'Could not read the existing browser data.')
    }
  }

  async function handleLegacyBackupFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error('Backup files must be 25 MB or smaller.')
      const snapshot = unwrapLegacySnapshot(JSON.parse(await file.text()))
      const preview = await previewLegacyMigration(snapshot)
      setMigrationPreview(preview)
      setMigrationFileName(file.name)
      setBackupSaved(false)
      setMigrationApproved(false)
      setMigrationOpen(true)
    } catch (error) {
      setToast(error.message || 'Could not read this legacy backup.')
    } finally {
      event.target.value = ''
    }
  }

  function downloadLegacyBackup() {
    if (!migrationPreview?.snapshot) return
    const data = JSON.stringify({ format: 'clothes-mania-legacy-backup', version: 1, exportedAt: new Date().toISOString(), snapshot: migrationPreview.snapshot }, null, 2)
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `clothes-mania-legacy-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setBackupSaved(true)
  }

  async function queueLegacyMigration() {
    if (!migrationPreview?.snapshot || !backupSaved || !migrationApproved) return
    try {
      const result = await importLegacySnapshot(migrationPreview.snapshot)
      await refresh()
      setMigrationPreview(current => ({ ...current, alreadyImported: true }))
      setMigrationOpen(false)
      setToast(`Imported ${result.products} products, ${result.orders} orders, and ${result.payments} payments locally. The full source snapshot is preserved and queued for sync.`)
      syncNow()
    } catch (error) {
      setToast(error.message || 'Legacy migration was not applied.')
    }
  }

  const filtered = useMemo(() => products.filter(product => {
    const match = `${product.name} ${product.sku} ${product.category} ${product.size} ${product.color}`.toLowerCase().includes(search.toLowerCase())
    return match && (filter === 'all' || (filter === 'low' ? product.quantity <= 5 : product.quantity === 0))
  }), [products, search, filter])

  if (!auth.ready) return <main className="grid min-h-screen place-items-center text-sm text-slate-500">Opening local workspace…</main>
  if (isSupabaseConfigured && !auth.user) return <AuthScreen onSignedIn={handleSignIn} notice={authError} />

  const syncLabel = !isSupabaseConfigured ? 'Local preview · Supabase not configured'
    : !connection ? 'Offline · saved on this device'
      : syncSummary.failed ? `${syncSummary.failed} sync issue${syncSummary.failed === 1 ? '' : 's'}`
        : syncSummary.pending ? `${syncSummary.pending} change${syncSummary.pending === 1 ? '' : 's'} pending sync`
          : syncSummary.lastSyncedAt ? 'All changes synced' : 'Connected · ready to sync'

  return <div className="min-h-screen bg-[#f5f5f4] text-slate-900">
    <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-7">
      <div className="flex items-center gap-3"><img src={Logo} alt="Clothes Mania Davao" className="h-10 w-10 object-contain" /><div><p className="text-sm font-bold leading-tight">Clothes Mania</p><p className="text-[10px] font-semibold tracking-[0.12em] text-amber-700">DAVAO POS</p></div></div>
      <div className="flex items-center gap-3">
        <span className={`hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold sm:inline-flex ${!isSupabaseConfigured ? 'bg-slate-100 text-slate-600' : connection ? syncSummary.failed ? 'bg-rose-50 text-rose-700' : syncSummary.pending ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}><span className={`h-1.5 w-1.5 rounded-full ${!isSupabaseConfigured ? 'bg-slate-400' : connection ? syncSummary.failed ? 'bg-rose-500' : syncSummary.pending ? 'bg-amber-500' : 'bg-emerald-500' : 'bg-slate-400'}`} />{syncLabel}</span>
        <span className="hidden text-xs text-slate-500 md:block">{auth.user?.email || 'Local workspace'}</span>
        <button className="button-secondary !min-h-8 !px-3 !py-1.5" onClick={syncNow} disabled={!isSupabaseConfigured || !connection || syncSummary.pending === 0} title="Sync queued changes"><Icon name="cloud" size={15}/><span className="ml-2">Sync</span></button>
      </div>
    </header>

    <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[224px_minmax(0,1fr)]">
      <aside className="hidden min-h-[calc(100vh-68px)] border-r border-slate-200 bg-white p-4 lg:block">
        <p className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Workspace</p>
        <nav aria-label="Main navigation" className="space-y-1">
          <button onClick={() => setActivePage('products')} className={`side-link w-full ${activePage === 'products' ? 'side-link-active' : ''}`}><Icon name="box" size={17}/>Products & Inventory</button>
          <button onClick={() => setActivePage('orders')} className={`side-link w-full ${activePage === 'orders' ? 'side-link-active' : ''}`}><Icon name="grid" size={17}/>POS & Orders</button>
          <button onClick={() => setActivePage('audit')} className={`side-link w-full ${activePage === 'audit' ? 'side-link-active' : ''}`}><Icon name="clock" size={17}/>Audit logs</button>
        </nav>
        <div className="absolute bottom-5 w-[190px] border-t border-slate-100 pt-4 text-[11px] text-slate-400">Local-first workspace<br/>Changes sync when online</div>
      </aside>

      <main className="min-w-0 px-4 py-6 sm:px-7 lg:px-9" id="overview">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="text-2xl font-bold tracking-tight text-slate-950">{activePage === 'products' ? 'Products & Inventory' : activePage === 'orders' ? 'POS & Orders' : 'Audit logs'}</h1><p className="mt-1 text-sm text-slate-500">{activePage === 'products' ? 'Track products, stock on hand, and every stock-in movement.' : activePage === 'orders' ? 'Record mines, collections, and order changes locally—even offline.' : 'Review who changed products, stock, orders, and payments.'}</p></div>
          {activePage === 'products' && <button className="button-primary" onClick={() => { setDialogProduct(null); setDialogMode('create'); setDialogOpen(true) }}><Icon name="plus" size={17}/>Add product</button>}
        </div>

        {!isSupabaseConfigured && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"><div><p className="font-semibold">Local preview mode</p><p className="mt-0.5 text-xs text-amber-800">Products save to this browser. Add Supabase settings to enable account sign-in and background sync.</p></div><Icon name="cloud" size={20}/></div>}
        {auth.offline && <div role="status" className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Offline session active. New changes are saved locally and queued for sync.</div>}

        {activePage === 'products' ? <>
        <section aria-label="Inventory summary" className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="metric-panel"><p className="metric-label">Active products</p><p className="metric-value">{summary.products}</p><p className="metric-note">Unique SKUs in catalog</p></div>
          <div className="metric-panel"><p className="metric-label">Units on hand</p><p className="metric-value">{summary.units.toLocaleString('en-PH')}</p><p className="metric-note">Across all products</p></div>
          <div className="metric-panel"><p className="metric-label">Low stock</p><p className={`metric-value ${summary.lowStock ? 'text-amber-700' : ''}`}>{summary.lowStock}</p><p className="metric-note">Five units or fewer</p></div>
          <div className="metric-panel"><p className="metric-label">Stock cost value</p><p className="metric-value text-[22px]">{money(summary.costValue)}</p><p className="metric-note">On-hand units × recorded cost</p></div>
        </section>

        <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <div><h2 className="font-semibold text-slate-900">Bring in records from the prototype</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">The older app and this client use separate browser storage. Export a JSON backup from the prototype, then select it here; the backup stays on this device until you sign in and approve migration.</p></div>
          <label className="button-secondary shrink-0 cursor-pointer">Select legacy JSON backup<input className="sr-only" type="file" accept=".json,application/json" onChange={handleLegacyBackupFile}/></label>
        </section>

        {migrationPreview && (migrationPreview.products > 0 || migrationPreview.orders > 0 || migrationPreview.liveSessions > 0 || migrationPreview.ledgerDays > 0 || migrationPreview.auditRecords > 0 || migrationPreview.deletedRecords > 0) && <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
          <div><h2 className="font-semibold text-slate-900">Legacy browser records found</h2><p className="mt-1 text-xs leading-5 text-slate-500">{migrationPreview.products} products · {migrationPreview.orders} orders · {migrationPreview.liveSessions} lives · {migrationPreview.auditRecords} audit entries · {migrationPreview.deletedRecords} deleted-record snapshots. {migrationPreview.sampleOrders} seeded orders are tagged as samples.</p></div>
          <button className="button-secondary mt-3 shrink-0 sm:mt-0" disabled={migrationPreview.alreadyImported} onClick={handleMigrationPreview}>{migrationPreview.alreadyImported ? 'Migration already queued' : 'Review & migrate records'}</button>
        </section>}

        <section id="products" className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
            <div><h2 className="font-bold text-slate-900">Product catalog</h2><p className="mt-1 text-xs text-slate-500">{filtered.length} of {products.length} products</p></div>
            <div className="flex w-full gap-2 sm:w-auto">
              <label className="relative min-w-0 flex-1 sm:w-60"><span className="sr-only">Search products</span><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="search" size={16}/></span><input className="field-input !h-10 !pl-9" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name or SKU" /></label>
              <select className="field-input !h-10 w-36" aria-label="Filter products" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All stock</option><option value="low">Low stock</option><option value="zero">Out of stock</option></select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.09em] text-slate-500"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Variant</th><th className="px-4 py-3 text-right">Cost</th><th className="px-4 py-3 text-right">Price</th><th className="px-4 py-3 text-right">On hand</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(product => <tr key={product.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3.5"><p className="font-semibold text-slate-900">{product.name}</p><p className="mt-0.5 text-xs text-slate-500">{product.category || 'Uncategorized'}</p></td>
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{product.sku}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{[product.size, product.color].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-slate-600">{money(product.cost)}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium tabular-nums text-slate-800">{money(product.price)}</td>
                  <td className="px-4 py-3.5 text-right"><span className={`inline-flex min-w-12 justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${product.quantity === 0 ? 'bg-rose-50 text-rose-700' : product.quantity <= 5 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>{product.quantity}</span></td>
                  <td className="px-4 py-3.5 text-right"><div className="inline-flex gap-1"><button className="table-action" onClick={() => { setDialogProduct(product); setDialogMode('edit'); setDialogOpen(true) }} aria-label={`Edit ${product.name}`} title="Edit product"><Icon name="edit" size={15}/></button><button className="button-secondary !min-h-8 !px-2.5 !py-1 text-xs" onClick={() => { setDialogProduct(product); setDialogMode('receive'); setDialogOpen(true) }}>Stock in</button></div></td>
                </tr>)}
                {!filtered.length && <tr><td colSpan="7" className="px-4 py-16 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-700"><Icon name="box" size={20}/></div><p className="mt-3 font-semibold text-slate-800">{products.length ? 'No products match this view' : 'Your catalog is ready for its first product'}</p><p className="mt-1 text-sm text-slate-500">{products.length ? 'Try a different search or stock filter.' : 'Add a product with a unique SKU to start tracking inventory.'}</p>{!products.length && <button className="button-primary mt-4" onClick={() => { setDialogProduct(null); setDialogMode('create'); setDialogOpen(true) }}><Icon name="plus" size={16}/>Add your first product</button>}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section id="movements" className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-2"><Icon name="clock" size={15}/>Stock movements are recorded with each opening stock and stock-in action.</span>
          <span>{syncSummary.lastSyncedAt ? `Last successful sync ${new Date(syncSummary.lastSyncedAt).toLocaleString('en-PH')}` : isSupabaseConfigured ? 'Waiting for first successful sync' : 'Supabase sync not configured'}</span>
        </section>
        </> : activePage === 'orders' ? <>
        <section aria-label="Weekly sales summary" className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="metric-panel"><p className="metric-label">Weekly order sales</p><p className="metric-value text-[22px]">{money(salesSummary.grossSales)}</p><p className="metric-note">Active orders · excludes samples</p></div>
          <div className="metric-panel"><p className="metric-label">Cash collected</p><p className="metric-value text-[22px]">{money(salesSummary.cashCollected)}</p><p className="metric-note">Collections less refunds</p></div>
          <div className="metric-panel"><p className="metric-label">Open balance</p><p className="metric-value text-[22px] text-rose-700">{money(salesSummary.pending)}</p><p className="metric-note">Active orders only</p></div>
          <div className="metric-panel"><p className="metric-label">Estimated gross profit</p><p className="metric-value text-[22px] text-emerald-700">{money(salesSummary.profit)}</p><p className="metric-note">Sales less recorded item cost</p></div>
        </section>
        <p className="mt-2 text-[11px] text-slate-500">Sales, unpaid balances, and profit use the order date; cash collected and refunds use their recorded transaction dates.</p>

        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-4"><h2 className="font-bold">Record a mine</h2><p className="mt-1 text-xs text-slate-500">Stock deduction, order, initial payment, audit entry, and sync queue save together.</p></div>
          <form onSubmit={handleCreateOrder} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="field-label">Buyer<input className="field-input" required maxLength="120" value={orderForm.buyer} onChange={event => setOrderForm({ ...orderForm, buyer: event.target.value })} /></label>
            <label className="field-label">Inventory item<select className="field-input" value={orderForm.productId} onChange={event => { const product = products.find(item => item.id === event.target.value); setOrderForm({ ...orderForm, productId: event.target.value, unitPrice: product ? String(product.price) : '', item: '' }) }}><option value="">Free-form / untracked item</option>{products.map(product => <option key={product.id} value={product.id} disabled={product.quantity < 1}>{product.name} · {product.sku} · {product.quantity} available</option>)}</select></label>
            {!orderForm.productId && <label className="field-label">Item details<input className="field-input" required maxLength="160" value={orderForm.item} onChange={event => setOrderForm({ ...orderForm, item: event.target.value })} placeholder="Describe the item" /></label>}
            <label className="field-label">Quantity<input className="field-input" type="number" min="1" step="1" required value={orderForm.quantity} onChange={event => setOrderForm({ ...orderForm, quantity: event.target.value })} /></label>
            <label className="field-label">Unit price (₱)<input className="field-input" type="number" min="0" step="0.01" required value={orderForm.unitPrice} onChange={event => setOrderForm({ ...orderForm, unitPrice: event.target.value })} /></label>
            <label className="field-label">Live name<input className="field-input" maxLength="100" value={orderForm.sessionName} onChange={event => setOrderForm({ ...orderForm, sessionName: event.target.value })} placeholder="Afternoon Live / Walk-in" /></label>
            <label className="field-label">Live seller<input className="field-input" maxLength="100" value={orderForm.seller} onChange={event => setOrderForm({ ...orderForm, seller: event.target.value })} /></label>
            <label className="field-label">Initial payment (₱)<input className="field-input" type="number" min="0" step="0.01" required value={orderForm.initialPayment} onChange={event => setOrderForm({ ...orderForm, initialPayment: event.target.value })} /></label>
            <label className="field-label">Payment method<select className="field-input" value={orderForm.paymentMethod} onChange={event => setOrderForm({ ...orderForm, paymentMethod: event.target.value })}><option>Cash</option><option>GCash</option><option>Maya</option><option>Bank transfer</option><option>COD</option><option>Other</option></select></label>
            <label className="field-label sm:col-span-2">Payment reference <span className="font-normal text-slate-400">(optional)</span><input className="field-input" maxLength="100" value={orderForm.paymentReference} onChange={event => setOrderForm({ ...orderForm, paymentReference: event.target.value })} /></label>
            <div className="flex items-end justify-end sm:col-span-2 xl:col-span-4"><button className="button-primary"><Icon name="plus" size={16}/>Save mine locally</button></div>
          </form>
          {orderForm.productId && <p className="mt-3 text-xs text-slate-500">Available stock: {products.find(product => product.id === orderForm.productId)?.quantity ?? 0} · Order total: {money(Number(orderForm.unitPrice || 0) * Number(orderForm.quantity || 0))}</p>}
        </section>

        <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4"><div><h2 className="font-bold">Orders & collections</h2><p className="mt-1 text-xs text-slate-500">Payments are separate timestamped records; unpaid balances remain visible.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{orders.length} orders</span></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.09em] text-slate-500"><tr><th className="px-4 py-3">Order date</th><th className="px-4 py-3">Buyer / live</th><th className="px-4 py-3">Item</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Collected</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(entry => <tr key={entry.order.id} className={entry.order.isSample ? 'bg-amber-50/30' : 'hover:bg-slate-50/70'}>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{entry.order.orderDate}<span className="mt-1 block text-[10px] text-slate-400">{entry.order.orderTime}</span></td>
                  <td className="px-4 py-3"><p className="font-semibold">{entry.order.buyer}</p><p className="mt-0.5 text-xs text-slate-500">{entry.order.sessionName || 'Unassigned'}{entry.order.seller ? ` · ${entry.order.seller}` : ''}</p></td>
                  <td className="px-4 py-3"><p>{entry.order.item}</p><p className="mt-0.5 text-xs text-slate-500">Qty {entry.order.quantity}{entry.order.isSample ? ' · Sample data' : ''}</p></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{money(entry.order.total)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{money(entry.paid)}</td>
                  <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${entry.balance > 0 ? 'text-rose-700' : 'text-slate-600'}`}>{money(entry.balance)}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${entry.order.status === 'cancelled' ? 'bg-slate-100 text-slate-600' : entry.balance === 0 ? 'bg-emerald-50 text-emerald-700' : entry.paid > 0 ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-700'}`}>{entry.order.status === 'cancelled' ? 'Cancelled' : entry.balance === 0 ? 'Paid' : entry.paid > 0 ? 'Partial' : 'Unpaid'}</span></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right"><div className="inline-flex gap-1">{entry.order.status === 'active' && entry.balance > 0 && <button className="button-secondary !min-h-8 !px-2.5 !py-1 text-xs" onClick={() => setPaymentOrder(entry)}>Payment</button>}{entry.order.status === 'active' && <button className="table-action text-rose-600" onClick={() => handleCancelOrder(entry.order)} title="Cancel order" aria-label={`Cancel ${entry.order.buyer}'s order`}><Icon name="close" size={15}/></button>}{entry.order.status === 'cancelled' && entry.paid > entry.refunded && <button className="button-secondary !min-h-8 !px-2.5 !py-1 text-xs" onClick={() => handleRefundOrder(entry)}>Refund</button>}</div></td>
                </tr>)}
                {!orders.length && <tr><td colSpan="8" className="px-4 py-14 text-center text-sm text-slate-500">No orders recorded yet. New sales save locally first.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        </> : <>
        <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4"><div><h2 className="font-bold">Recent activity</h2><p className="mt-1 text-xs text-slate-500">Entries are saved locally with the business change and sync when online.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{auditLogs.length} events</span></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[700px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.09em] text-slate-500"><tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Admin / operator</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Record</th><th className="px-4 py-3">Details</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{auditLogs.map(entry => <tr key={entry.id}><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{new Date(entry.occurredAt).toLocaleString('en-PH')}</td><td className="px-4 py-3 text-xs">{entry.actorEmail || 'Local operator'}</td><td className="px-4 py-3 font-semibold">{entry.action.replaceAll('_', ' ')}</td><td className="px-4 py-3 text-xs capitalize text-slate-600">{entry.entityType}</td><td className="max-w-[360px] px-4 py-3 text-xs text-slate-600">{entry.summary}</td></tr>)}{!auditLogs.length && <tr><td colSpan="5" className="px-4 py-14 text-center text-sm text-slate-500">No activity recorded on this device yet.</td></tr>}</tbody>
          </table></div>
        </section>
        </>}
      </main>
    </div>

    {dialogOpen && <ProductDialog product={dialogProduct} initialMode={dialogMode} onClose={() => setDialogOpen(false)} onSave={handleSaveProduct} onReceive={handleReceiveStock} />}
    {paymentOrder && <PaymentDialog order={paymentOrder} onClose={() => setPaymentOrder(null)} onSave={handleSavePayment} />}
    {migrationOpen && migrationPreview && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"><section role="dialog" aria-modal="true" aria-labelledby="migration-title" className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><h2 id="migration-title" className="text-lg font-bold">Review legacy data migration</h2><p className="mt-1 text-sm leading-6 text-slate-500">{migrationFileName ? `Backup file: ${migrationFileName}. ` : ''}Products, orders, collections, lives, and audit history are mapped into local records. Deleted snapshots and report-only daily ledger entries remain in the complete recoverable archive.</p></div><button className="icon-button" onClick={() => setMigrationOpen(false)} aria-label="Close"><Icon name="close"/></button></div><dl className="my-5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4"><div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">Products</dt><dd className="mt-1 font-bold">{migrationPreview.products}</dd></div><div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">Orders</dt><dd className="mt-1 font-bold">{migrationPreview.orders}</dd></div><div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">Live sessions</dt><dd className="mt-1 font-bold">{migrationPreview.liveSessions}</dd></div><div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">Ledger days</dt><dd className="mt-1 font-bold">{migrationPreview.ledgerDays}</dd></div></dl><p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{migrationPreview.sampleOrders} seeded sample order(s) are retained and tagged; they stay excluded from real sales totals. Legacy payment dates are estimated from the original order date because the old records did not retain payment timestamps.</p><button className="button-secondary mt-4 w-full" onClick={downloadLegacyBackup}>{backupSaved ? 'Download backup again' : 'Download JSON backup first'}</button>{backupSaved && <p className="mt-2 text-xs font-semibold text-emerald-700">Backup download started. Confirm you saved it before continuing.</p>}<label className="mt-4 flex items-start gap-2 text-sm leading-5 text-slate-700"><input type="checkbox" className="mt-1 accent-amber-500" checked={migrationApproved} onChange={event => setMigrationApproved(event.target.checked)}/><span>I saved the backup and approve importing all listed legacy records on this device.</span></label><footer className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4"><button className="button-secondary" onClick={() => setMigrationOpen(false)}>Cancel</button><button className="button-primary" disabled={!backupSaved || !migrationApproved} onClick={queueLegacyMigration}>Import & queue sync</button></footer></section></div>}
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[60] flex max-w-sm items-start gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl"><Icon name="check" size={17}/><span>{toast}</span></div>}
  </div>
}

export default App
