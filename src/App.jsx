import { useEffect, useState } from 'react';

const pages = { dashboard: 'Dashboard', products: 'Products', orders: 'Orders', returns: 'Returns', payments: 'Payments', store: 'My store', reports: 'Reports', settings: 'Settings', onboarding: 'Seller onboarding', start: 'Start selling online', login: 'Seller login' };
const money = (value) => `₹${Number(value).toLocaleString('en-IN')}`;

function App() {
  const [page, setPage] = useState('start');
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMenu, setAuthMenu] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderCounts, setOrderCounts] = useState({});
  const [orderTab, setOrderTab] = useState('Pending');
  const [orderQuery, setOrderQuery] = useState('');
  const [orderSearchField, setOrderSearchField] = useState('Order ID');
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [ordersRevision, setOrdersRevision] = useState(0);
  const [paymentsData, setPaymentsData] = useState(null);
  const [paymentQuery, setPaymentQuery] = useState('');
  const [paymentPeriod, setPaymentPeriod] = useState('30 days');
  const [returnItems, setReturnItems] = useState([]);
  const [returnSummary, setReturnSummary] = useState(null);
  const [returnTab, setReturnTab] = useState('overview');
  const [returnQuery, setReturnQuery] = useState('');
  const [returnStatus, setReturnStatus] = useState('all');
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [range, setRange] = useState('Today');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState('');
  const [step, setStep] = useState(() => Number(sessionStorage.getItem('nexaStep') || 0));
  const [onboardData, setOnboardData] = useState({});
  const [pennyVerified, setPennyVerified] = useState(false);

  useEffect(() => { fetch('/api/auth/me').then((r) => r.json()).then((result) => { if (result.authenticated) { setAuthUser(result.user); setPage('dashboard'); } else setPage('start'); }).catch(() => setPage('start')).finally(() => setAuthLoading(false)); }, []);
  useEffect(() => { if (!authUser) return; fetch('/api/dashboard').then((r) => r.ok ? r.json() : null).then((result) => result && setDashboard(result)).catch(() => {}); }, [authUser]);
  useEffect(() => {
    if (!authUser) return;
    if (page !== 'products' && page !== 'dashboard' && page !== 'store') return;
    const params = new URLSearchParams({ q: page === 'products' ? query : '', category: page === 'products' ? category : 'all', status: page === 'products' ? status : 'all' });
    fetch(`/api/products?${params}`).then((r) => r.json()).then(setProducts).catch(() => setProducts([]));
  }, [authUser, page, query, category, status]);
  useEffect(() => {
    if (!authUser || page !== 'returns') return;
    const params = new URLSearchParams({ q: returnQuery, status: returnStatus, tab: returnTab });
    fetch(`/api/returns?${params}`).then((response) => response.json()).then((result) => { setReturnSummary(result.summary); setReturnItems(result.returns); }).catch(() => {});
  }, [authUser, page, returnQuery, returnStatus, returnTab]);
  useEffect(() => {
    if (!authUser || page !== 'orders') return;
    const params = new URLSearchParams({ q: orderQuery, status: orderTab, field: orderSearchField });
    fetch(`/api/orders?${params}`).then((response) => response.json()).then((result) => { setOrders(result.orders); setOrderCounts(result.counts); setSelectedOrderIds([]); }).catch(() => {});
  }, [authUser, page, orderQuery, orderSearchField, orderTab, ordersRevision]);
  useEffect(() => {
    if (!authUser || page !== 'payments') return;
    const params = new URLSearchParams({ q: paymentQuery, period: paymentPeriod });
    fetch(`/api/payments?${params}`).then((response) => response.json()).then(setPaymentsData).catch(() => {});
  }, [authUser, page, paymentQuery, paymentPeriod]);

  function navigate(next) { const privatePages = ['dashboard','products','orders','returns','payments','store','reports','settings']; setPage(privatePages.includes(next) && !authUser ? 'login' : next); setAuthMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function showToast(message) { setToast(message); window.clearTimeout(window.toastTimer); window.toastTimer = window.setTimeout(() => setToast(''), 2600); }
  async function signIn(email, password) {
    try { const response = await fetch('/api/auth/login', { method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ email,password }) }); const result = await response.json(); if (!response.ok) return showToast(result.error || 'Could not sign in.'); setAuthUser(result.user); setPage('dashboard'); setLoginEmail(''); showToast(`Welcome back, ${result.user.fullName.split(' ')[0]}!`); }
    catch { showToast('Could not reach the server. Make sure the app is running and try again.'); }
  }
  async function logOut() {
    await fetch('/api/auth/logout',{method:'POST'}).catch(()=>{});
    setAuthUser(null); setAuthMenu(false); setDashboard(null); setProducts([]); setPage('start'); showToast('You are signed out.');
  }
  async function runAction(action) {
    if (action === 'stock') return navigate('products');
    const result = await fetch(`/api/actions/${action}`, { method: 'POST' }).then((r) => r.json()).catch(() => ({ message: 'Done.' }));
    showToast(result.message);
  }
  async function runReturnAction(returnId, action) {
    const response = await fetch(`/api/returns/${returnId}/action`, { method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action}) });
    const result = await response.json();
    if (!response.ok) return showToast(result.error || 'Could not update return.');
    setReturnItems((items) => items.map((item) => item.id === returnId ? result.return : item));
    setSelectedReturn((item) => item?.id === returnId ? result.return : item);
    showToast(`Return ${returnId} marked ${result.return.status.toLowerCase()}.`);
  }
  async function runOrderAction(orderId, action) {
    const response = await fetch(`/api/orders/${orderId}/action`, { method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action}) });
    const result = await response.json();
    if (!response.ok) return showToast(result.error || 'Could not update this order.');
    setOrders((current) => current.filter((order) => order.id !== orderId));
    setOrderCounts((current) => ({ ...current, [result.order.status]: (current[result.order.status] || 0) + 1, Pending: Math.max(0, (current.Pending || 0) - 1) }));
    showToast(`Order ${result.order.orderNo} ${action === 'accept' ? 'accepted' : 'cancelled'}.`);
  }
  async function runBulkOrderAction(action) {
    if (!selectedOrderIds.length) return;
    const response = await fetch('/api/orders/bulk-action', { method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:selectedOrderIds,action}) });
    const result = await response.json();
    if (!response.ok) return showToast(result.error || 'Could not update selected orders.');
    const accepted = result.count;
    setSelectedOrderIds([]); setOrdersRevision((revision) => revision + 1);
    showToast(`${accepted} order${accepted === 1 ? '' : 's'} ${action === 'accept' ? 'accepted' : 'cancelled'}.`);
  }
  function downloadPaymentCsv() {
    const lines = [['Order number','Sub-order number','Payout date','Amount','Status'],...(paymentsData?.transactions || []).map((row) => [row.orderNo,row.subOrderNo,row.date,row.amount,row.status])];
    const csv = lines.map((line) => line.map((cell) => `"${String(cell).replaceAll('"','""')}"`).join(',')).join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); link.download = 'nexaseller-payments.csv'; link.click(); URL.revokeObjectURL(link.href);
  }
  async function addProduct(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const response = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    const result = await response.json();
    if (!response.ok) return showToast(result.error || 'Could not save product.');
    setModal(false); form.reset(); showToast(`${result.name} added to your catalog.`); navigate('products');
  }
  function moveStep(direction) {
    const next = Math.min(6, Math.max(0, step + direction));
    setStep(next); sessionStorage.setItem('nexaStep', String(next));
    if (step === 6 && direction === 1) { sessionStorage.removeItem('nexaStep'); setStep(0); setOnboardData({}); showToast('Your seller setup is complete.'); navigate('dashboard'); }
  }
  function updateOnboarding(key, value) { setOnboardData((current) => ({ ...current, [key]: value })); }
  async function continueOnboarding(event) {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) { event.currentTarget.reportValidity(); return; }
    if (step === 0 && onboardData.password !== onboardData.confirmPassword) return showToast('Your passwords do not match.');
    if (step === 3 && onboardData.accountNumber !== onboardData.confirmAccountNumber) return showToast('Bank account numbers do not match.');
    if (step === 3 && !pennyVerified) return showToast('Complete the penny drop validation to continue.');
    if (step < 6) return moveStep(1);
    try {
      const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: onboardData.email, password: onboardData.password, fullName: onboardData.fullName, storeName: onboardData.storeName }) });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) { setLoginEmail(onboardData.email); setPage('login'); }
        return showToast(result.error || 'Could not create your account.');
      }
      setAuthUser(result.user); setStep(0); setOnboardData({}); setPennyVerified(false); sessionStorage.removeItem('nexaStep'); setPage('dashboard');
      showToast('Your seller account is ready, ' + result.user.fullName.split(' ')[0] + '!');
    } catch { showToast('Could not reach the server. Make sure the app is running and try again.'); }
  }
  if (authLoading) return <div className="auth-loading">NexaSeller <span>Loading your seller workspace…</span></div>;

  return <div className={`shell ${authUser ? '' : 'guest-shell'}`}>
    {authUser && <aside className="sidebar">
      <a className="brand" href="#start" onClick={(e) => { e.preventDefault(); navigate('start'); }}><span className="brand-mark">N</span><span><span className="brand-name">NexaSeller</span><span className="brand-sub">MERCHANT HUB</span></span></a>
      <div className="nav-label">Workspace</div><nav className="nav" aria-label="Main navigation">
        <NavButton page="dashboard" current={page} onClick={navigate} icon="▦" />
        <NavButton page="products" current={page} onClick={navigate} icon="▤" />
        <NavButton page="orders" current={page} onClick={navigate} icon="♧" count={String(orderCounts.Pending ?? 3)} />
        <NavButton page="returns" current={page} onClick={navigate} icon="↩" count="3" />
        <NavButton page="payments" current={page} onClick={navigate} icon="▣" />
        <NavButton page="store" current={page} onClick={navigate} icon="⌂" />
      </nav>
      <div className="nav-label" style={{ marginTop: 28 }}>Manage</div><nav className="nav">
        <NavButton page="reports" current={page} onClick={navigate} icon="⌁" />
        <NavButton page="settings" current={page} onClick={navigate} icon="⚙" />
      </nav>
      <div className="sidebar-bottom"><div className="help-card"><strong>Need a hand?</strong><p>Our seller support team is here to help you grow.</p><button className="text-link" onClick={() => showToast('Seller support is ready to help.')}>Visit help centre&nbsp; →</button></div><div className="user-mini"><div className="avatar">{authUser.fullName?.[0] || 'S'}</div><div><strong>{authUser.fullName}</strong><small>{authUser.storeName}</small></div><button className="user-menu" aria-label="Log out" onClick={logOut}>↪</button></div></div>
    </aside>}
    <main className="main">
      <header className="topbar">{authUser ? <><div className="crumb">Workspace&nbsp; / &nbsp;<b>{pages[page]}</b></div><div className="top-actions"><div className="store-pill"><span className="store-dot" />Store is live</div><button className="icon-btn" aria-label="Search" onClick={() => { navigate('products'); setTimeout(() => document.getElementById('product-search')?.focus(), 50); }}>⌕</button><button className="icon-btn" aria-label="Notifications" onClick={() => showToast('You’re all caught up on notifications.')}>♧<i className="notification-dot" /></button><div className="account-menu"><button className="avatar" title={authUser.fullName} onClick={() => setAuthMenu(!authMenu)}>{authUser.fullName?.[0] || 'S'}</button>{authMenu && <div className="account-dropdown"><b>{authUser.fullName}</b><small>{authUser.email}</small><button onClick={logOut}>↪ &nbsp;Log out</button></div>}</div></div></> : <><a className="guest-brand" href="#start" onClick={(event)=>{event.preventDefault();navigate('start')}}><span className="brand-mark">N</span><b>NexaSeller</b></a><div className="top-actions"><button className="btn btn-secondary btn-sm" onClick={()=>navigate('login')}>Log in</button><button className="btn btn-primary btn-sm" onClick={()=>navigate('onboarding')}>Create seller account</button></div></>}</header>
      <section className="content">
        {page === 'dashboard' && authUser && <Dashboard dashboard={dashboard} user={authUser} products={products} range={range} setRange={setRange} navigate={navigate} runAction={runAction} openModal={() => setModal(true)} />}
        {page === 'products' && <Products products={products} query={query} setQuery={setQuery} category={category} setCategory={setCategory} status={status} setStatus={setStatus} openModal={() => setModal(true)} showToast={showToast} />}
        {page === 'orders' && <Orders orders={orders} counts={orderCounts} tab={orderTab} setTab={setOrderTab} query={orderQuery} setQuery={setOrderQuery} searchField={orderSearchField} setSearchField={setOrderSearchField} selectedIds={selectedOrderIds} setSelectedIds={setSelectedOrderIds} onAction={runOrderAction} onBulkAction={runBulkOrderAction} />}
        {page === 'returns' && <Returns items={returnItems} summary={returnSummary} tab={returnTab} setTab={setReturnTab} query={returnQuery} setQuery={setReturnQuery} status={returnStatus} setStatus={setReturnStatus} onSelect={setSelectedReturn} onAction={runReturnAction} showToast={showToast} />}
        {page === 'payments' && <Payments data={paymentsData} query={paymentQuery} setQuery={setPaymentQuery} period={paymentPeriod} setPeriod={setPaymentPeriod} onDownload={downloadPaymentCsv} navigate={navigate} />}
        {page === 'store' && <MyStore user={authUser} products={products} navigate={navigate} openAddProduct={() => setModal(true)} showToast={showToast} />}
        {page === 'settings' && <SettingsPage showToast={showToast} logOut={logOut} />}
        {page === 'start' && <Landing navigate={navigate} />}
        {page === 'login' && <LoginPage email={loginEmail} onLogin={signIn} navigate={navigate} />}
        {page === 'onboarding' && <Onboarding step={step} data={onboardData} updateData={updateOnboarding} pennyVerified={pennyVerified} setPennyVerified={setPennyVerified} continueOnboarding={continueOnboarding} moveStep={moveStep} navigate={navigate} />}
        {!['dashboard', 'products', 'orders', 'returns', 'payments', 'store', 'settings', 'start', 'login', 'onboarding'].includes(page) && <Placeholder page={page} navigate={navigate} />}
      </section>
    </main>
    {authUser && <nav className="mobile-nav" aria-label="Mobile navigation">{[['dashboard','▦'],['products','▤'],['orders','♧'],['returns','↩'],['payments','▣'],['store','⌂']].map(([key, icon]) => <button key={key} className={page === key ? 'active' : ''} onClick={() => navigate(key)}><span>{icon}</span>{key === 'store' ? 'Store' : pages[key]}</button>)}</nav>}
    {modal && <ProductModal onClose={() => setModal(false)} onSubmit={addProduct} />}
    {selectedReturn && <ReturnDetails item={selectedReturn} onClose={() => setSelectedReturn(null)} onAction={runReturnAction} />}
    {toast && <div className="toast show" role="status">{toast}</div>}
  </div>;
}

function NavButton({ page, current, onClick, icon, count }) { return <button className={current === page ? 'active' : ''} onClick={() => onClick(page)}><span className="nav-icon">{icon}</span>{pages[page]}{count && <span className="nav-count">{count}</span>}</button>; }
function ProductThumb({ product }) { return <div className="product-thumb" style={{ background: product.bg || '#f0efff' }}>{product.icon || '📦'}</div>; }

function Dashboard({ dashboard, user, products, range, setRange, navigate, runAction, openModal }) {
  const metrics = dashboard?.metrics || { revenue: 24850, orders: 38, settlement: 52400, visits: 2840, weeklyRevenue: 142890 };
  const shownRevenue = range === 'Today' ? metrics.revenue : range === 'Last 7 Days' ? 142890 : 568420;
  return <>
    <div className="page-head"><div><h1>Welcome back, {user?.fullName?.split(' ')[0] || 'Seller'}! <span style={{ fontSize: 22 }}>👋</span></h1><p>Here’s what’s happening with <b>{user?.storeName || 'your store'}</b> today.</p></div><div className="head-actions"><span className="verified">✓ &nbsp;Seller account</span></div></div>
    <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '-7px 0 12px' }}><div className="range-switch">{['Today','Last 7 Days','This Month'].map((x) => <button key={x} className={range === x ? 'active' : ''} onClick={() => setRange(x)}>{x}</button>)}</div></div>
    <div className="stats"><Stat label="Sales revenue" value={money(shownRevenue)} icon="↗" foot={<><span className="trend">↗ 18.4%</span> vs previous period</>} spark /><Stat label="Orders" value={metrics.orders} icon="♧" foot={<><span className="trend">+12%</span> from yesterday</>} /><Stat label="Settlement" value={money(metrics.settlement)} icon="▣" foot="Due Wed, 10:00 AM" /><Stat label="Store visits" value={metrics.visits.toLocaleString('en-IN')} icon="◉" foot={<><span className="trend">↗ 8.2%</span> this week</>} /></div>
    <div className="dashboard-grid"><div className="stack">
      <article className="card section-card"><div className="section-title"><h2>Action required</h2><span className="badge-count">3</span><span className="sub">Live SLA</span></div><div className="action-list">{(dashboard?.actions || []).map((item, i) => <div className="action-row" key={item.id}><div className={`action-icon ${i === 1 ? 'orange' : i === 2 ? 'teal' : ''}`}>{item.icon}</div><div className="action-copy"><strong>{item.title}</strong><small className={i === 0 ? 'urgent' : ''}>{i === 0 && '◷ '}{item.detail}</small></div><div className="row-actions"><button className={i === 0 ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'} onClick={() => runAction(item.id)}>{item.action}</button>{i === 0 && <button className="btn btn-secondary btn-sm" onClick={() => runAction('manifest')}>Manifest</button>}</div></div>)}</div></article>
      <article className="card section-card"><div className="section-title"><h2>Order pipeline</h2><span className="sub">Live fulfillment</span></div><div className="pipeline">{Object.entries(dashboard?.pipeline || { new:12, packed:18, transit:24, delivered:31 }).map(([key,value]) => <div className="pipeline-cell" key={key}><strong>{value}</strong><span>{key === 'transit' ? 'In transit' : key[0].toUpperCase()+key.slice(1)}</span></div>)}</div></article>
      <article className="card chart-card"><div className="chart-top"><div><span className="stat-label">Weekly revenue</span><strong>{money(metrics.weeklyRevenue)}</strong><small>Compared with last week</small></div><span className="trend">↗ 14.2%</span></div><div className="chart">{[48,63,55,73,82,100,100].map((height,i) => <div className="bar-col" key={i}><div className={`bar ${i > 4 ? 'highlight' : ''}`} style={{ height: `${height}%` }} /><span className="bar-day">{'MTWTFSS'[i]}</span></div>)}</div><div className="chart-note">↗ &nbsp;Top category: <b>Ethnic &amp; Western Fashion</b> (64 orders)</div></article>
      <article className="card section-card"><div className="section-title"><h2>Top selling products</h2><button className="text-link" style={{ marginLeft:'auto' }} onClick={() => navigate('products')}>View all (48) →</button></div><div className="product-mini">{products.slice(0,3).map((p,i) => <div className="product-row" key={p.id}><ProductThumb product={p} /><div><div className="product-name">{p.name}</div><div className="product-meta">{p.sold} sold this week &nbsp; <b style={{ color:'var(--green)' }}>{money(p.price*p.sold)}</b><br />★ 4.{i ? '9':'8'} (142)</div></div><div className="product-price">{money(p.price)}<small className={p.stock<20?'low':''}>{p.stock} in stock</small></div></div>)}</div></article>
    </div><div className="stack"><article className="card chart-card"><div className="section-title"><h2>Store shortcuts</h2></div><div className="shortcut-grid"><Shortcut icon="⊞" title="Add product" detail="List a new item in catalog" onClick={openModal} /><Shortcut icon="▤" title="GST reports" detail="Download tax summaries" onClick={() => navigate('reports')} /><Shortcut icon="▦" title="Courier pass" detail="Batch scan daily manifest" onClick={() => runAction('manifest')} /><Shortcut icon="♧" title="Settlements" detail="Bank accounts & ledger" onClick={() => navigate('payments')} /></div></article>
      <article className="card section-card"><div className="section-title"><h2>Recent activity</h2><span className="sub"><span className="live-dot">Live feed</span></span></div><div className="activity-list"><Activity icon="⌑" title="Order #NEX-88219" detail="Cotton Kurti (M) · ₹599 paid via UPI (PhonePe)" time="14m ago" /><Activity icon="▣" title="Courier delhivery assigned" detail="12 packages assigned for afternoon courier dispatch." time="42m ago" /><Activity icon="✓" title="Payout processed" detail="₹14,200 credited to HDFC Bank A/c ••••1948" time="3h ago" /></div></article>
      <article className="card section-card" style={{ background:'linear-gradient(135deg,#08734f,#0b8a61)',color:'#fff',border:0 }}><div style={{ font:"700 14px 'Plus Jakarta Sans'",marginBottom:7 }}>Your store is growing 🌱</div><div style={{ fontSize:11,opacity:.82,lineHeight:1.55,marginBottom:13 }}>You’re just 2 products away from unlocking your next seller milestone.</div><button className="btn btn-sm" style={{ background:'#fff',color:'var(--green)' }} onClick={openModal}>Add a product&nbsp; →</button></article>
    </div></div>
  </>;
}
function Stat({ label, value, icon, foot, spark }) { return <article className="card stat"><span className="stat-label">{label}</span><span className="stat-icon">{icon}</span><div className="stat-value">{value}</div><div className="stat-foot">{foot}</div>{spark && <div className="spark"><svg viewBox="0 0 300 44" preserveAspectRatio="none"><path d="M2 35 L35 23 L60 29 L91 13 L119 19 L153 8 L181 16 L209 3 L238 14 L268 7 L298 0" /></svg></div>}</article>; }
function Shortcut({ icon, title, detail, onClick }) { return <button className="shortcut" onClick={onClick}><div className="action-icon">{icon}</div><strong>{title}</strong><span>{detail}</span></button>; }
function Activity({ icon, title, detail, time }) { return <div className="activity"><div className="action-icon">{icon}</div><div className="activity-copy"><strong>{title}</strong><small>{detail}</small></div><time>{time}</time></div>; }

function Products({ products, query, setQuery, category, setCategory, status, setStatus, openModal, showToast }) {
  return <><div className="page-head"><div><h1>My products</h1><p>Manage your catalog, pricing and stock in one place.</p></div><div className="head-actions"><button className="btn btn-primary" onClick={openModal}>＋ &nbsp;Add product</button></div></div>
    <div className="catalog-toolbar"><label className="search"><span>⌕</span><input id="product-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products by name or SKU..." /></label><select className="select" value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">All categories</option>{['Fashion & Apparel','Food & Grocery','Home & Kitchen','Beauty & Personal Care','Jewellery'].map((x) => <option key={x}>{x}</option>)}</select><select className="select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All status</option><option>Live</option><option>Low stock</option><option>Draft</option></select><button className="btn btn-secondary" onClick={() => showToast('Your product list is ready to export.')}>↓ &nbsp;Export</button></div>
    <article className="card"><div className="table-wrap"><table className="catalog-table"><thead><tr><th style={{ width:'36%' }}>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th /></tr></thead><tbody>{products.map((p) => <tr key={p.id}><td><div className="table-product"><ProductThumb product={p} /><div><strong>{p.name}</strong><small>{p.sold} sold this week</small></div></div></td><td>{p.sku}</td><td>{p.category}</td><td><b>{money(p.price)}</b></td><td>{p.stock} units</td><td><span className={`status ${p.status === 'Live' ? 'live' : p.status === 'Draft' ? 'draft' : 'low'}`}>{p.status}</span></td><td><button className="table-actions" aria-label="Product options" onClick={() => showToast(`Options for ${p.name}`)}>⋯</button></td></tr>)}{!products.length && <tr><td colSpan="7" style={{ textAlign:'center',padding:35,color:'#778197' }}>No products match your search.</td></tr>}</tbody></table></div><div className="pagination"><span>Showing {products.length} products</span><div className="pages"><button className="active">1</button><button onClick={() => showToast('More catalog pages coming soon.')}>2</button><button>3</button><button>→</button></div></div></article>
  </>;
}

function ProductModal({ onClose, onSubmit }) { return <div className="overlay open" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><div><h2 id="modal-title">Add a new product</h2><p>Give your customers something new to love.</p></div><button className="close" onClick={onClose} aria-label="Close">×</button></div><form onSubmit={onSubmit}><div className="form-grid"><div className="field full"><label>Product images</label><div className="upload">▧ &nbsp; <b>Upload images</b> or drag and drop<br /><span>JPG or PNG, up to 5 MB each</span></div></div><div className="field full"><label htmlFor="product-name">Product name</label><input id="product-name" name="name" required placeholder="e.g. Handmade Cotton Kurti" /></div><div className="field"><label htmlFor="product-category">Category</label><select id="product-category" name="category"><option>Fashion &amp; Apparel</option><option>Food &amp; Grocery</option><option>Home &amp; Kitchen</option><option>Beauty &amp; Personal Care</option><option>Other</option></select></div><div className="field"><label htmlFor="product-sku">Seller SKU</label><input id="product-sku" name="sku" placeholder="e.g. KUR-001" /></div><div className="field"><label htmlFor="product-price">Selling price (₹)</label><input id="product-price" name="price" type="number" min="1" required placeholder="599" /></div><div className="field"><label htmlFor="product-stock">Available stock</label><input id="product-stock" name="stock" type="number" min="0" required placeholder="25" /></div><div className="field full"><label htmlFor="product-description">Description</label><textarea id="product-description" name="description" placeholder="Tell customers what makes this product special..." /></div></div><div className="modal-foot"><button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button><button className="btn btn-primary" type="submit">Save product&nbsp; →</button></div></form></div></div>; }

function Orders({ orders, counts, tab, setTab, query, setQuery, searchField, setSearchField, selectedIds, setSelectedIds, onAction, onBulkAction }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [breachingOnly, setBreachingOnly] = useState(false);
  const [sortNewest, setSortNewest] = useState(true);
  const statuses = ['On Hold','Pending','Ready to Ship','Shipped'];
  const visible = [...orders].filter((order)=>!breachingOnly||order.sla==='Breaching soon').sort((a,b)=>sortNewest?new Date(a.dispatchDate)-new Date(b.dispatchDate):new Date(b.dispatchDate)-new Date(a.dispatchDate));
  const allSelected = visible.length>0&&visible.every((order)=>selectedIds.includes(order.id));
  function toggle(id){setSelectedIds((current)=>current.includes(id)?current.filter((x)=>x!==id):[...current,id]);}
  return <><div className="page-head"><div><h1>Orders</h1><p>Review incoming orders and keep dispatches on schedule.</p></div><div className="head-actions"><button className="btn btn-secondary" onClick={()=>setFilterOpen(!filterOpen)}>⚙ &nbsp;Order settings</button></div></div>
    <div className="orders-learn"><span>▶</span><b>Learn how to process your orders</b><span className="learn-arrow">›</span></div>
    <div className="order-tabs">{statuses.map((name)=><button key={name} className={tab===name?'active':''} onClick={()=>setTab(name)}>{name} <span>({counts[name]||0})</span></button>)}</div>
    <div className="order-search-row"><select className="select" value={searchField} onChange={(e)=>setSearchField(e.target.value)}><option>Order ID</option><option>SKU ID</option><option>Marketplace ID</option><option>Sub-order ID</option></select><label className="search"><span>⌕</span><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder={'Search by '+searchField} /></label></div>
    <div className="order-tool-row"><button className={breachingOnly?'active':''} onClick={()=>setBreachingOnly(!breachingOnly)}>◷ &nbsp;SLA {breachingOnly?'· On':' '}</button><button onClick={()=>setSortNewest(!sortNewest)}>▤ &nbsp;Dispatch {sortNewest?'↑':'↓'}</button><button className={filterOpen?'active':''} onClick={()=>setFilterOpen(!filterOpen)}>▽ &nbsp;Filter</button></div>
    {filterOpen&&<div className="order-filter-panel"><label><input type="checkbox" checked={breachingOnly} onChange={(e)=>setBreachingOnly(e.target.checked)}/> Only show orders nearing dispatch SLA</label><span>Dispatch date order: {sortNewest?'Soonest first':'Latest first'}</span></div>}
    <div className="select-all-row"><label><input type="checkbox" checked={allSelected} onChange={(e)=>setSelectedIds(e.target.checked?visible.map((order)=>order.id):[])}/> Select all orders</label>{selectedIds.length>0&&<div className="bulk-actions"><span>{selectedIds.length} selected</span><button className="btn btn-secondary btn-sm" onClick={()=>onBulkAction('cancel')}>Cancel selected</button><button className="btn btn-primary btn-sm" onClick={()=>onBulkAction('accept')}>Accept selected</button></div>}</div>
    <div className="order-list">{visible.map((order)=><article className="card order-card" key={order.id}><div className="order-card-head"><label><input type="checkbox" checked={selectedIds.includes(order.id)} onChange={()=>toggle(order.id)}/> <span>Order No: <b>{order.orderNo}</b></span></label><time>{new Date(order.date).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</time></div><h2>{order.product}</h2><div className="order-product-row"><div className="order-product-image" style={{background:order.bg}}>{order.image}</div><div className="order-meta"><span><small>Quantity</small><b>{order.quantity} unit{order.quantity===1?'':'s'}</b></span><span><small>Size</small><b>{order.size}</b></span><span><small>SKU ID</small><b>{order.sku}</b></span><span><small>Marketplace ID</small><b>{order.marketplaceId}</b></span><span><small>Sub-order ID</small><b>{order.subOrderId}</b></span></div></div><div className="order-card-foot"><div><span>Dispatch date: <b>{new Date(order.dispatchDate+'T12:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</b></span><span className={order.sla==='Breaching soon'?'sla-warning':'sla-ok'}>SLA: {order.sla}</span></div>{order.status==='Pending'?<div className="row-actions"><button className="btn btn-secondary btn-sm" onClick={()=>onAction(order.id,'cancel')}>Cancel</button><button className="btn btn-primary btn-sm" onClick={()=>onAction(order.id,'accept')}>Accept</button></div>:<span className="status live">{order.status}</span>}</div></article>)}{!visible.length&&<article className="card order-empty">No orders in this tab match your search.</article>}</div>
  </>;
}

function Payments({ data, query, setQuery, period, setPeriod, onDownload }) {
  const [showUnshipped, setShowUnshipped] = useState(false);
  return <><div className="page-head"><div><h1>Payments</h1><p>See upcoming payouts, completed settlements, and order-level payment details.</p></div><div className="head-actions"><button className="btn btn-primary btn-sm" onClick={onDownload}>↓ &nbsp;Download</button></div></div>
    <div className="payment-toolbar"><label className="search"><span>⌕</span><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search by order / sub-order number" /></label><select className="select" value={period} onChange={(e)=>setPeriod(e.target.value)}><option>30 days</option><option>This month</option><option>Last 3 months</option></select></div>
    <div className="payment-panels"><PaymentPanel title="Upcoming payments" panel={data?.upcoming} lines={data?.lines?.upcoming} upcoming /><PaymentPanel title="Completed payments" panel={data?.completed} lines={data?.lines?.completed} /></div>
    {query&&<article className="card payment-matches"><div className="section-title"><h2>Matching order payments</h2><span className="sub">{data?.transactions?.length||0} records</span></div><div className="table-wrap"><table className="catalog-table"><thead><tr><th>Order number</th><th>Sub-order number</th><th>Payout date</th><th>Status</th><th>Amount</th></tr></thead><tbody>{data?.transactions?.map((item)=><tr key={item.orderNo}><td>{item.orderNo}</td><td>{item.subOrderNo}</td><td>{item.date}</td><td><span className={'status '+(item.status==='Completed'?'live':'low')}>{item.status}</span></td><td><b>{money(item.amount)}</b></td></tr>)}{!data?.transactions?.length&&<tr><td colSpan="5" className="returns-empty">No payments match this order number.</td></tr>}</tbody></table></div></article>}
    <article className="card unshipped-panel"><div className="unshipped-icon">🚚</div><div><b>Unshipped payments</b><span>Payments expected from your shipped orders. Once delivered, they will automatically move to upcoming payments.</span>{showUnshipped&&<small>{data?.unshipped?.orders||0} orders · Estimated payout {money(data?.unshipped?.estimated||0)}</small>}</div><button className="btn btn-secondary btn-sm" onClick={()=>setShowUnshipped(!showUnshipped)}>{showUnshipped?'Hide details':'View details'}</button></article>
  </>;
}
function PaymentPanel({ title, panel, lines, upcoming=false }) {
  return <article className="card payment-panel"><div className="payment-panel-head"><div><h2>{title}</h2><span>{upcoming?'Expected payout':'Settled to your bank'}</span></div><span className={'payment-label '+(upcoming?'upcoming':'completed')}>{panel?.label||'Loading'}</span></div><div className="payment-dates">{(panel?.dates||[]).map((item)=><div key={item.day}><small>{item.day}</small><b>{money(item.amount)}</b></div>)}</div><div className="payment-breakdown-head"><b>Transaction type</b><b>Details</b><b>Amount</b></div><div className="payment-breakdown">{(lines||[]).map((line,index)=><div className="payment-line" key={index}><b>{line.type}</b><span>{line.detail}</span><strong>{money(line.amount)}</strong></div>)}</div><div className="payment-net"><span>Net amount</span><b>{money(panel?.total||0)}</b></div></article>;
}

function Returns({ items, summary, tab, setTab, query, setQuery, status, setStatus, onSelect, onAction, showToast }) {
  const tabs = [['overview','Overview'],['tracking','Return Tracking'],['claims','Claim Tracking'],['courier','Courier Partner']];
  return <><div className="page-head"><div><h1>Return / RTO Orders</h1><p>Review customer returns, follow courier movement, and manage claims.</p></div><div className="head-actions"><button className="btn btn-secondary" onClick={() => showToast('Return help and guidelines are coming soon.')}>▶ &nbsp;How it works</button></div></div>
    <div className="return-promo"><div className="promo-icon">↩</div><div className="promo-copy"><b>High returns giving you a headache?</b><span>Review your return trends and track every shipment from one place.</span></div><button className="btn btn-primary btn-sm" onClick={() => setTab('claims')}>View return insights</button><button className="btn btn-secondary btn-sm" onClick={() => showToast('Seller support will contact you soon.')}>Request callback</button></div>
    <div className="return-tabs">{tabs.map(([key,label])=><button key={key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}</button>)}</div>
    {tab==='courier' ? <CourierReturns /> : <>
      {tab==='overview' && <><div className="section-title return-summary-title"><h2>Summary</h2><span className="sub">Last 30 days</span><button className="text-link" style={{marginLeft:'auto'}} onClick={()=>setTab('tracking')}>View tracking →</button></div><div className="return-summary-grid"><article className="card return-metric"><span>Customer return rate</span><strong>{summary?.customerReturnRate||'—'}</strong><small>↘ &nbsp;5.64% &nbsp;·&nbsp; {summary?.customerReturned||'Loading'}</small></article><article className="card return-metric"><span>Courier return (RTO) rate</span><strong>{summary?.courierReturnRate||'—'}</strong><small>↘ &nbsp;3.67% &nbsp;·&nbsp; {summary?.courierReturned||'Loading'}</small></article><article className="card return-metric dual-metric"><div><span>Wrong / defective return rate</span><strong>{summary?.wrongDefectiveRate||'—'}</strong></div><div><span>Marketplace return rate</span><strong className="red-value">{summary?.standardReturnRate||'—'}</strong></div></article><article className="card return-metric claim-metric"><span>RTO approved claims</span><strong>{summary?.claimApproval||'—'}</strong><small>Track eligible courier claims from Claim Tracking.</small><button className="btn btn-secondary btn-sm" onClick={()=>setTab('claims')}>View claims&nbsp; →</button></article></div></>}
      <article className="card returns-table-card"><div className="returns-table-head"><div><h2>{tab==='claims'?'Return claims':tab==='tracking'?'Return tracking':'Customer returns'}</h2><span>{items.length} return {items.length===1?'order':'orders'}</span></div><div className="returns-filters"><label className="search return-search"><span>⌕</span><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search order ID, SKU or AWB number" /></label><select className="select" value={status} onChange={(e)=>setStatus(e.target.value)}><option value="all">All statuses</option>{['Requested','Approved','In transit','Received','Refunded','Rejected'].map((x)=><option key={x}>{x}</option>)}</select></div></div>
        <div className="table-wrap"><table className="catalog-table return-table"><thead><tr><th>Product details</th><th>Order / AWB</th><th>Customer</th><th>Return date</th><th>Refund</th><th>Status</th><th>Action</th></tr></thead><tbody>{items.map((item)=><tr key={item.id}><td><div className="table-product"><ProductThumb product={item}/><div><strong>{item.product}</strong><small>SKU: {item.sku}</small></div></div></td><td><b>{item.orderId}</b><small className="table-secondary">AWB {item.awb}</small></td><td>{item.customer}</td><td>{new Date(item.returnedAt+'T12:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td><td><b>{money(item.refundAmount)}</b></td><td><ReturnStatus status={item.status}/></td><td><button className="btn btn-secondary btn-sm" onClick={()=>onSelect(item)}>Review</button></td></tr>)}{!items.length&&<tr><td colSpan="7" className="returns-empty">No return orders match these filters.</td></tr>}</tbody></table></div>
      </article>
    </>}
    {tab==='claims'&&<p className="returns-footnote">Claim records in this prototype are sample data. Connect your courier or marketplace claim service to submit and track real claims.</p>}
  </>;
}
function ReturnStatus({ status }) { const key=status.toLowerCase().replaceAll(' ','-');return <span className={'return-status '+key}>{status}</span>; }
function CourierReturns() { return <div className="courier-grid"><article className="card section-card"><div className="section-title"><h2>Courier return rate</h2><span className="sub">Last 30 days</span></div><strong className="courier-rate">9.38%</strong><p className="muted">18 RTO orders out of 192 dispatched</p><div className="courier-bar"><span style={{width:'9.38%'}}/></div><div className="courier-legend"><span>Returned 18</span><span>Delivered 174</span></div></article><article className="card section-card"><div className="section-title"><h2>Courier partners</h2><span className="sub">Returns in transit</span></div>{[['Delhivery','8 returns','9.1%'],['Xpressbees','6 returns','10.2%'],['Blue Dart','4 returns','7.8%']].map(([name,count,rate])=><div className="courier-row" key={name}><div className="courier-logo">{name.slice(0,1)}</div><b>{name}</b><span>{count}</span><strong>{rate}</strong></div>)}</article></div>; }
function ReturnDetails({ item, onClose, onAction }) {
  const actions={Requested:[['approve','Approve return','btn-primary'],['reject','Reject request','btn-secondary']],Approved:[['pickup','Mark picked up','btn-primary']], 'In transit':[['receive','Mark received','btn-primary']],Received:[['refund','Issue refund','btn-primary']]};
  return <div className="overlay open" role="presentation" onMouseDown={(event)=>event.target===event.currentTarget&&onClose()}><div className="modal return-modal" role="dialog" aria-modal="true" aria-labelledby="return-modal-title"><div className="modal-head"><div><h2 id="return-modal-title">Return {item.id}</h2><p>Order {item.orderId} · AWB {item.awb}</p></div><button className="close" onClick={onClose} aria-label="Close">×</button></div><div className="return-detail-product"><ProductThumb product={item}/><div><b>{item.product}</b><span>SKU {item.sku} · {money(item.refundAmount)}</span></div><ReturnStatus status={item.status}/></div><div className="return-detail-grid"><div><small>Customer</small><b>{item.customer}</b></div><div><small>Requested</small><b>{new Date(item.returnedAt+'T12:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}</b></div><div className="full"><small>Return reason</small><b>{item.reason}</b></div></div><div className="return-timeline"><span className="timeline-dot done"/><div><b>Return request created</b><small>{item.returnedAt}</small></div><span className={'timeline-dot '+(['Approved','In transit','Received','Refunded'].includes(item.status)?'done':'')}/><div><b>{['Approved','In transit','Received','Refunded'].includes(item.status)?'Return approved':'Awaiting seller review'}</b><small>{['Approved','In transit','Received','Refunded'].includes(item.status)?'Status updated':'Review the request and choose an action'}</small></div></div><div className="modal-foot">{(actions[item.status]||[]).map(([action,label,style])=><button key={action} className={'btn '+style} onClick={()=>onAction(item.id,action)}>{label}</button>)}<button className="btn btn-secondary" onClick={onClose}>Close</button></div></div></div>;
}

function Landing({ navigate }) { return <><div className="card" style={{ overflow:'hidden',background:'linear-gradient(120deg,#f0fbf5 0%,#f4f2ff 100%)',padding:'clamp(28px,6vw,72px)',marginBottom:18 }}><div style={{ maxWidth:650 }}><span className="verified">India’s seller-first marketplace</span><h1 style={{ font:"800 clamp(32px,5vw,54px)/1.12 'Plus Jakarta Sans'",letterSpacing:-1.8,margin:'23px 0 14px' }}>Start selling online to <span style={{ color:'var(--green)' }}>10 Crore+</span> customers across India.</h1><p style={{ color:'#68758a',fontSize:15,lineHeight:1.7,maxWidth:570,margin:'0 0 23px' }}>Grow your business with simple onboarding, fast payments and tools that make every order easier to manage.</p><button className="btn btn-primary" onClick={() => navigate('onboarding')}>Create your seller account&nbsp; →</button><span style={{ marginLeft:13,color:'var(--muted)',fontSize:11 }}>Free to join · Setup in minutes</span></div></div><div className="stats"><Stat label="Businesses growing with us" value="7 Lakh+" icon="↗" foot="Across every corner of India" /><Stat label="Commission" value="0%" icon="✓" foot="Across all categories" /><Stat label="Fast settlements" value="7 days" icon="▣" foot="Direct to your bank account" /><Stat label="Seller support" value="24/7" icon="♡" foot="Here when you need us" /></div><article className="card section-card"><div className="section-title"><h2>Everything you need to grow</h2><span className="sub">One simple seller workspace</span></div><div className="shortcut-grid"><Shortcut icon="▤" title="Upload your products" detail="Bring your catalog online in a few simple steps." onClick={() => navigate('onboarding')} /><Shortcut icon="↗" title="Reach new customers" detail="Show your products to shoppers across India." onClick={() => navigate('onboarding')} /><Shortcut icon="▣" title="Receive secure payouts" detail="Track settlements and keep your finances clear." onClick={() => navigate('onboarding')} /><Shortcut icon="♧" title="Manage every order" detail="See order status, shipments and customer queries." onClick={() => navigate('onboarding')} /></div></article></>; }

function LoginPage({ email, onLogin, navigate }) {
  const [formEmail, setFormEmail] = useState(email || '');
  const [password, setPassword] = useState('');
  function submit(event) { event.preventDefault(); onLogin(formEmail, password); }
  return <article className="card login-card"><div className="login-mark">N</div><h1>Welcome back</h1><p>Sign in to manage your seller store.</p><form onSubmit={submit}><div className="field"><label htmlFor="login-email">Email address</label><input id="login-email" type="email" required autoComplete="username" value={formEmail} onChange={(event)=>setFormEmail(event.target.value)} placeholder="you@business.com" /></div><div className="field"><label htmlFor="login-password">Password</label><input id="login-password" type="password" required autoComplete="current-password" value={password} onChange={(event)=>setPassword(event.target.value)} placeholder="Enter your password" /></div><button className="btn btn-primary login-submit" type="submit">Log in to dashboard&nbsp; →</button></form><div className="login-foot">New to NexaSeller? <button className="text-link" onClick={()=>navigate('onboarding')}>Create a seller account</button></div></article>;
}

function Onboarding({ step, data, updateData, pennyVerified, setPennyVerified, continueOnboarding, moveStep, navigate }) {
  const steps = ['Account', 'OTP', 'KYC', 'Bank', 'Business', 'Location', 'Review'];
  const copy = [
    ['Create your seller account', 'Join merchants growing their business nationwide. Fast setup in about 5 minutes.'],
    ['Verify your mobile number', 'Enter the one-time password sent to your mobile number.'],
    ['Regulatory compliance', 'Add the identity and tax details required for seller payouts. Your documents stay private.'],
    ['Bank details', 'Add the account that should receive your seller settlements.'],
    ['Business classification', 'Choose your legal entity, trading model and main product category.'],
    ['Pickup & business location', 'Add the address where courier partners will collect your outgoing shipments.'],
    ['Review your application', 'Check the details before you finish creating your seller account.'],
  ][step];

  return <>
    <div className="page-head"><div><h1>Seller registration</h1><p>Complete each step to set up your seller account and verify your business.</p></div><div className="head-actions"><button className="btn btn-secondary" onClick={() => navigate('start')}>← Public landing page</button></div></div>
    <article className="card section-card registration-card">
      <div className="registration-progress"><b>Step {step + 1} of {steps.length}</b><span className="muted">{Math.round((step + 1) / steps.length * 100)}% complete</span></div>
      <div className="progress-track"><div style={{ width: ((step + 1) / steps.length * 100) + '%' }} /></div>
      <div className="onboarding-steps">{steps.map((label, index) => <button type="button" key={label} className={'onboarding-step ' + (index === step ? 'current ' : '') + (index < step ? 'done' : '')} onClick={() => index < step && moveStep(index - step)}><span>{index < step ? '✓' : index + 1}</span>{label}</button>)}</div>
      <h2 className="registration-title">{copy[0]}</h2><p className="muted registration-intro">{copy[1]}</p>
      <form onSubmit={continueOnboarding} noValidate>
        <OnboardingFields step={step} data={data} updateData={updateData} pennyVerified={pennyVerified} setPennyVerified={setPennyVerified} />
        <div className="modal-foot registration-footer"><button type="button" className="btn btn-secondary" disabled={step === 0} onClick={() => moveStep(-1)}>← Back</button><button type="submit" className="btn btn-primary">{step === 6 ? 'Finish registration' : 'Save & continue'}&nbsp; →</button></div>
      </form>
      <div className="registration-security">🔒 &nbsp;Your information is protected and used only for seller verification.</div>
    </article>
  </>;
}

function OnboardingFields({ step, data, updateData, pennyVerified, setPennyVerified }) {
  const value = (key) => data[key] || '';
  const update = (key) => ({ value: value(key), onChange: (event) => updateData(key, event.target.value) });
  const field = (label, key, placeholder, options = {}) => <div className={'field ' + (options.full ? 'full' : '')} key={key}>
    <label htmlFor={'registration-' + key}>{label}{options.required ? ' *' : ''}</label>
    {options.choices
      ? <select id={'registration-' + key} required={Boolean(options.required)} {...update(key)}><option value="">{placeholder}</option>{options.choices.map((item) => <option key={item}>{item}</option>)}</select>
      : options.textarea
        ? <textarea id={'registration-' + key} required={Boolean(options.required)} placeholder={placeholder} {...update(key)} />
        : <input id={'registration-' + key} required={Boolean(options.required)} type={options.type || 'text'} min={options.min} max={options.max} minLength={options.minLength} pattern={options.pattern} placeholder={placeholder} {...update(key)} />}
  </div>;
  const upload = (label, key, hint, required = false) => <div className="field" key={key}><label>{label}{required ? ' *' : ''}</label><label className="file-upload">▧ &nbsp; <b>{value(key) || 'Choose file to upload'}</b><small>{hint}</small><input type="file" accept=".pdf,.jpg,.jpeg,.png" required={required} onChange={(event) => updateData(key, event.target.files && event.target.files[0] ? event.target.files[0].name : '')} /></label></div>;

  if (step === 0) return <div className="onboard-form-grid">
    <div className="form-section-title">1. Personal information</div>
    {field('Full name', 'fullName', 'Name as shown on your PAN card', { required: true })}
    {field('Mobile number', 'mobile', '10-digit mobile number', { required: true, type: 'tel', pattern: '[0-9]{10}' })}
    {field('Email address', 'email', 'you@business.com', { required: true, type: 'email' })}
    {field('Create password', 'password', 'At least 8 characters', { required: true, type: 'password', minLength: 8 })}
    {field('Confirm password', 'confirmPassword', 'Re-enter your password', { required: true, type: 'password', minLength: 8 })}
    <div className="form-section-title">2. Store information</div>
    {field('Store name', 'storeName', 'Name visible to marketplace buyers', { required: true })}
    {field('Business type', 'accountBusinessType', 'Select business type', { required: true, choices: ['Sole Proprietorship', 'Partnership Firm', 'Private Limited (Pvt Ltd)', 'Individual / Artisan / Home Maker'] })}
    {field('Primary product category', 'accountCategory', 'Select primary category', { required: true, choices: ['Fashion & Apparel', 'Electronics & Gadgets', 'Home & Kitchen', 'Beauty & Personal Care', 'Grocery & Gourmet', 'Handicrafts & Art', 'Sports & Fitness'] })}
    {field('Store description', 'storeDescription', 'Tell buyers about your business', { full: true, textarea: true })}
    <label className="consent-field"><input type="checkbox" required checked={Boolean(data.agreement)} onChange={(event) => updateData('agreement', event.target.checked)} /> I agree to the NexaSeller Merchant Agreement, Logistics Policy and Privacy Terms.</label>
  </div>;

  if (step === 1) return <div className="onboard-form-grid">
    <div className="verification-note full"><b>Mobile verification</b><span>Enter the 6-digit code sent to {value('mobile') ? '+91 ' + value('mobile') : 'your mobile number'}.</span></div>
    {field('One-time password', 'otp', '6-digit OTP', { required: true, pattern: '[0-9]{6}' })}
    <div className="field"><label>Verification</label><button type="button" className="btn btn-secondary" onClick={() => updateData('otpSent', true)}>{data.otpSent ? '✓ Code sent' : 'Send a new code'}</button></div>
    <p className="muted full">Demo flow: enter any 6 digits to continue. SMS delivery requires an OTP provider integration.</p>
  </div>;

  if (step === 2) return <div className="onboard-form-grid">
    <div className="form-section-title">1. Personal details</div>
    {field('Full name as per PAN card', 'panName', value('fullName') || 'Full legal name', { required: true })}
    {field('Date of birth', 'dob', '', { required: true, type: 'date', max: new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().slice(0, 10) })}
    {field('Permanent residential / tax address', 'taxAddress', 'Flat, street, area, city, state and PIN code', { required: true, full: true, textarea: true })}
    <div className="form-section-title">2. Identity credentials</div>
    {field('Permanent Account Number (PAN)', 'panNumber', 'ABCDE1234F', { required: true, pattern: '[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}' })}
    {field('Aadhaar / Voter ID / Passport number', 'identityNumber', 'Identity document number', { required: true })}
    <div className="form-section-title">3. Supporting documents</div>
    {upload('PAN card photo', 'panDocument', 'Front side showing photo and signature', true)}
    {upload('Aadhaar card · front', 'aadhaarFront', 'Front side of Aadhaar card', true)}
    {upload('Aadhaar card · back', 'aadhaarBack', 'Back side of Aadhaar card', true)}
    {upload('Business registration', 'businessDocument', 'Shop & Establishment / Udyam MSME')}
    <label className="consent-field full"><input type="checkbox" required checked={Boolean(data.kycDeclaration)} onChange={(event) => updateData('kycDeclaration', event.target.checked)} /> I declare that the information and identity credentials above are accurate, legally valid and belong to me. I authorize verification with relevant authorities.</label>
  </div>;

  if (step === 3) return <div className="onboard-form-grid">
    <div className="verification-note full"><b>₹1.00 penny drop validation</b><span>We’ll verify that the account belongs to the beneficiary. This demo displays a local confirmation only.</span></div>
    {field('Account holder full name', 'accountHolder', value('panName') || 'Name as shown on your bank account', { required: true })}
    {field('Commercial bank', 'bankName', 'Select your bank', { required: true, choices: ['HDFC Bank', 'State Bank of India (SBI)', 'ICICI Bank', 'Axis Bank', 'Punjab National Bank', 'Kotak Mahindra Bank', 'Bank of Baroda', 'Other'] })}
    {field('Bank account number', 'accountNumber', 'Enter account number', { required: true })}
    {field('Re-enter account number', 'confirmAccountNumber', 'Confirm account number', { required: true })}
    {field('IFSC code', 'ifsc', 'e.g. HDFC0001234', { required: true, pattern: '[A-Za-z]{4}0[A-Za-z0-9]{6}' })}
    <div className="field"><label>Account validation</label><button type="button" className="btn btn-secondary" onClick={() => setPennyVerified(true)}>{pennyVerified ? '✓ Penny drop verified' : 'Verify account with ₹1 test'}</button>{pennyVerified && <small className="success-note">Beneficiary match confirmed · Demo validation</small>}</div>
  </div>;

  if (step === 4) return <div className="onboard-form-grid">
    <div className="form-section-title">Legal constitution / entity type</div>
    {field('Registered entity type', 'entityType', 'Select legal entity', { required: true, choices: ['Sole Proprietorship', 'Partnership / LLP', 'Private Limited (Pvt Ltd)', 'One Person Company (OPC)', 'Public Limited / Trust / NGO'] })}
    <div className="form-section-title">Primary operational model</div>
    {field('How are your goods sourced or made?', 'operationalModel', 'Select your operating model', { required: true, choices: ['Retail / Wholesaler / Trader', 'Manufacturer / Producer', 'Handmade & Custom Crafts'] })}
    <div className="form-section-title">Primary product category</div>
    {field('Highest volume inventory category', 'primaryCategory', 'Select primary product category', { required: true, choices: ['Fashion & Apparel', 'Electronics & Gadgets', 'Home & Kitchen', 'Beauty & Personal Care', 'Grocery & Gourmet', 'Handicrafts & Art', 'Sports & Fitness'] })}
    <div className="verification-note full"><b>Tailored compliance & tax structure</b><span>Your choices help map applicable tax and category rules. Final compliance treatment depends on your verified business details.</span></div>
  </div>;

  if (step === 5) return <div className="onboard-form-grid">
    <div className="verification-note full"><b>Logistics & courier pickups</b><span>Couriers collect daily from this registered address. Keep the contact phone available between 9 AM and 7 PM.</span></div>
    {field('Pickup contact person', 'pickupContact', 'Manager / in-charge name', { required: true })}
    {field('Mobile number for OTP pickups', 'pickupPhone', '10-digit mobile number', { required: true, type: 'tel', pattern: '[0-9]{10}' })}
    {field('Pickup address', 'pickupAddress', 'Unit, building, street, area and landmark', { required: true, full: true, textarea: true })}
    {field('City', 'pickupCity', 'City', { required: true })}
    {field('State', 'pickupState', 'State', { required: true })}
    {field('PIN code', 'pickupPin', '6-digit PIN code', { required: true, pattern: '[0-9]{6}' })}
    {field('GPS coordinates (optional)', 'gpsCoordinates', 'Latitude, longitude')}
    {field('Preferred daily pickup window', 'pickupWindow', 'Select pickup window', { required: true, choices: ['Morning · 10:00 AM – 02:00 PM', 'Evening · 03:00 PM – 07:00 PM'] })}
  </div>;

  return <div className="review-grid">{[['Applicant', (value('fullName') || '—') + ' · ' + (value('email') || '—')], ['Store', (value('storeName') || '—') + ' · ' + (value('accountCategory') || '—')], ['PAN / KYC', (value('panName') || '—') + ' · ' + (value('panNumber') || '—')], ['Documents', [value('panDocument'), value('aadhaarFront'), value('aadhaarBack'), value('businessDocument')].filter(Boolean).join(' · ') || 'No files selected'], ['Bank', (value('bankName') || '—') + ' · ' + (value('accountHolder') || '—') + ' · ' + (value('ifsc') || '—')], ['Business', (value('entityType') || '—') + ' · ' + (value('operationalModel') || '—') + ' · ' + (value('primaryCategory') || '—')], ['Pickup', (value('pickupAddress') || '—') + ' · ' + value('pickupCity') + ' ' + value('pickupPin')]].map(([label, content]) => <div className="review-row" key={label}><b>{label}</b><span>{content}</span></div>)}</div>;
}function MyStore({ user, products, navigate, openAddProduct, showToast }) {
  const [range,setRange]=useState('7 Days');
  const [editing,setEditing]=useState(false);
  const [previewing,setPreviewing]=useState(false);
  const [profile,setProfile]=useState({name:user?.storeName||'Sharma Enterprise',description:'Thoughtfully selected fashion and everyday essentials, made with care for customers across India.',location:'Bengaluru, Karnataka',phone:'+91 98765 43210',email:user?.email||'hello@sharmaenterprise.in'});
  const [draft,setDraft]=useState(profile);
  const ranges={
    '7 Days':{labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],sales:[28,44,39,65,52,82,100],orders:[18,31,27,48,42,63,74]},
    '30 Days':{labels:['1 Sep','6 Sep','11 Sep','16 Sep','21 Sep','26 Sep','30 Sep'],sales:[34,40,55,48,71,82,100],orders:[22,28,41,36,57,61,78]},
    '3 Months':{labels:['Jul','Aug','Sep','Oct','Nov','Dec','Jan'],sales:[31,44,38,60,55,76,100],orders:[22,32,30,48,44,61,81]}
  };
  const chart=ranges[range];
  const points=(values)=>values.map((value,index)=>(42+index*102)+','+(174-value*1.35)).join(' ');
  const featured=products.slice(0,4);
  const recentOrders=[
    {id:'NEX-88219',customer:'Priya Mehta',product:'Handmade Cotton Kurti',amount:599,status:'Pending'},
    {id:'NEX-88218',customer:'Rohan Shah',product:'Homemade Mango Pickle',amount:498,status:'Confirmed'},
    {id:'NEX-88204',customer:'Ananya Rao',product:'Jewellery Set (Kundan)',amount:299,status:'Shipped'},
    {id:'NEX-88196',customer:'Kabir Joshi',product:'Block Print Cushion Cover',amount:399,status:'Delivered'}
  ];
  async function shareStore(){const slug=profile.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');const link=window.location.origin+'/store/'+slug;try{await navigator.clipboard.writeText(link);showToast('Store link copied to clipboard.')}catch{showToast('Store link: '+link)}}
  function saveProfile(event){event.preventDefault();setProfile(draft);setEditing(false);showToast('Store profile updated.')}
  return <>
    <div className="store-page-head"><div><div className="store-kicker">SELLER STOREFRONT</div><h1>My Store</h1><div className="store-title-meta"><span>{profile.name}</span><span className="store-live-badge"><i/>Live</span></div></div><button className="btn btn-secondary btn-sm preview-store-btn" onClick={()=>setPreviewing(true)}>↗ &nbsp;Preview store</button></div>
    <section className="store-metrics"><StoreMetric icon="◉" label="Store visits" value="1,245" note="↑ 12% this week"/><StoreMetric icon="▤" label="Products" value="24" note="Across 6 categories"/><StoreMetric icon="♧" label="Orders" value="86" note="5 need your attention"/><StoreMetric icon="₹" label="Total sales" value="₹45,600" note="↑ 8.4% this month"/></section>
    <section className="store-quick-actions"><button className="btn btn-primary" onClick={openAddProduct}>＋ &nbsp;Add product</button><button className="btn btn-secondary" onClick={()=>{setDraft(profile);setEditing(true)}}>✎ &nbsp;Edit store</button><button className="btn btn-secondary" onClick={()=>navigate('products')}>▤ &nbsp;Manage products</button><button className="btn btn-secondary" onClick={shareStore}>↗ &nbsp;Share store</button></section>
    <div className="store-main-grid">
      <article className="card store-panel performance-panel"><div className="store-panel-heading"><div><h2>Store performance</h2><p>Sales and orders over time</p></div><div className="store-chart-filters">{['7 Days','30 Days','3 Months'].map((item)=><button key={item} className={range===item?'active':''} onClick={()=>setRange(item)}>{item}</button>)}</div></div><div className="store-chart-legend"><span><i className="legend-sales"/>Sales</span><span><i className="legend-orders"/>Orders</span></div><div className="store-chart-wrap"><svg className="store-chart" viewBox="0 0 700 220" role="img" aria-label={'Sales and orders for '+range}><line x1="42" y1="30" x2="654" y2="30"/><line x1="42" y1="78" x2="654" y2="78"/><line x1="42" y1="126" x2="654" y2="126"/><line x1="42" y1="174" x2="654" y2="174"/><polyline className="sales-line" points={points(chart.sales)}/><polyline className="orders-line" points={points(chart.orders)}/>{chart.sales.map((value,index)=><circle key={index} className="sales-point" cx={42+index*102} cy={174-value*1.35} r="3.5"/>)}{chart.labels.map((label,index)=><text key={label} x={42+index*102} y="205" textAnchor="middle">{label}</text>)}</svg></div><div className="chart-summary"><span><i className="legend-sales"/>Sales <b>₹45,600</b></span><span><i className="legend-orders"/>Orders <b>86</b></span></div></article>
      <article className="card store-panel profile-panel"><div className="store-panel-heading"><div><h2>Store profile</h2><p>Your public business details</p></div><button className="icon-btn store-edit-icon" aria-label="Edit store profile" onClick={()=>{setDraft(profile);setEditing(true)}}>✎</button></div><div className="store-profile-brand"><div className="store-logo">SE</div><div><h3>{profile.name}</h3><span className="store-live-badge"><i/>Live</span></div></div><p className="store-description">{profile.description}</p><div className="store-contact-list"><span>⌖ <b>{profile.location}</b></span><span>☎ <b>{profile.phone}</b></span><span>✉ <b>{profile.email}</b></span></div><div className="profile-progress-heading"><b>Profile completion</b><strong>85%</strong></div><div className="profile-progress"><span/></div><button className="btn btn-secondary btn-sm" onClick={()=>{setDraft(profile);setEditing(true)}}>Edit store profile</button></article>
    </div>
    <article className="card store-panel featured-panel"><div className="store-panel-heading"><div><h2>Featured products</h2><p>Products customers are seeing in your store</p></div><button className="text-link" onClick={()=>navigate('products')}>View all products&nbsp; →</button></div><div className="featured-products">{featured.map((product,index)=><div className="featured-product" key={product.id}><div className="featured-product-image" style={{background:product.bg||'#f1eff8'}}><span>{product.icon||'📦'}</span><span className="featured-live">LIVE</span></div><h3>{product.name}</h3><div className="featured-price-line"><b>{money(product.price)}</b><span className={product.stock<10?'low-stock':''}>{product.stock} in stock</span></div><div className="featured-rating">★ <b>{['4.8','4.9','4.6','4.7'][index]}</b><span>({[42,36,28,19][index]} reviews)</span><button onClick={()=>navigate('products')}>Edit</button></div></div>)}{!featured.length&&<div className="store-products-empty">Loading featured products…</div>}</div></article>
    <div className="store-bottom-grid">
      <article className="card store-panel recent-orders-panel"><div className="store-panel-heading"><div><h2>Recent orders</h2><p>Your latest customer activity</p></div><button className="text-link" onClick={()=>navigate('orders')}>View all orders&nbsp; →</button></div><div className="store-orders-table-wrap"><table className="store-orders-table"><thead><tr><th>Order ID</th><th>Customer</th><th>Product</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>{recentOrders.map((order)=><tr key={order.id}><td><b>{order.id}</b></td><td>{order.customer}</td><td>{order.product}</td><td><b>{money(order.amount)}</b></td><td><span className={'store-order-status '+order.status.toLowerCase()}>{order.status}</span></td><td><button onClick={()=>navigate('orders')}>View</button></td></tr>)}</tbody></table></div></article>
      <article className="card store-panel health-panel"><div className="store-panel-heading"><div><h2>Store health</h2><p>Keep your store in great shape</p></div><span className="health-score">Good</span></div><div className="health-completion"><div><span>Profile completion</span><b>85%</b></div><div className="profile-progress"><span/></div></div><HealthRow icon="▤" label="Products listed" value="24"/><HealthRow icon="!" label="Low-stock products" value="3" warning/><HealthRow icon="♧" label="Pending orders" value="5" warning/></article>
    </div>
    {editing&&<div className="overlay open" role="presentation" onMouseDown={(event)=>event.target===event.currentTarget&&setEditing(false)}><div className="modal store-edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-store-title"><div className="modal-head"><div><h2 id="edit-store-title">Edit store profile</h2><p>Update the details customers see on your store.</p></div><button className="close" onClick={()=>setEditing(false)}>×</button></div><form onSubmit={saveProfile}><div className="form-grid"><div className="field full"><label>Store name</label><input required value={draft.name} onChange={(event)=>setDraft({...draft,name:event.target.value})}/></div><div className="field full"><label>Store description</label><textarea value={draft.description} onChange={(event)=>setDraft({...draft,description:event.target.value})}/></div><div className="field"><label>Location</label><input value={draft.location} onChange={(event)=>setDraft({...draft,location:event.target.value})}/></div><div className="field"><label>Contact phone</label><input value={draft.phone} onChange={(event)=>setDraft({...draft,phone:event.target.value})}/></div><div className="field full"><label>Contact email</label><input type="email" value={draft.email} onChange={(event)=>setDraft({...draft,email:event.target.value})}/></div></div><div className="modal-foot"><button type="button" className="btn btn-secondary" onClick={()=>setEditing(false)}>Cancel</button><button className="btn btn-primary" type="submit">Save changes</button></div></form></div></div>}
    {previewing&&<div className="overlay open" role="presentation" onMouseDown={(event)=>event.target===event.currentTarget&&setPreviewing(false)}><div className="modal store-preview-modal" role="dialog" aria-modal="true"><div className="modal-head"><div><h2>Store preview</h2><p>This is how your seller storefront appears to customers.</p></div><button className="close" onClick={()=>setPreviewing(false)}>×</button></div><div className="preview-store-head"><div className="store-logo">SE</div><div><b>{profile.name}</b><span>● Live seller · {profile.location}</span></div></div><p className="store-description">{profile.description}</p><div className="preview-items">{featured.map((product)=><div key={product.id}><ProductThumb product={product}/><b>{product.name}</b><span>{money(product.price)}</span></div>)}</div></div></div>}
  </>;
}
function StoreMetric({ icon,label,value,note }) { return <article className="card store-metric"><span className="store-metric-icon">{icon}</span><div><small>{label}</small><strong>{value}</strong><span>{note}</span></div></article>; }
function HealthRow({ icon,label,value,warning=false }) { return <div className="health-row"><span className={'health-icon '+(warning?'warning':'')}>{icon}</span><span>{label}</span><b className={warning?'health-warning':''}>{value}</b></div>; }
function SettingsPage({ showToast, logOut }) {
  const [activeSection, setActiveSection] = useState('store-profile');
  const [logoName, setLogoName] = useState('');
  const sections = [
    ['store-profile', 'Store Profile', '◉'], ['business-information', 'Business Information', '▤'],
    ['account-information', 'Account Information', '♙'], ['payments-bank', 'Payments & Bank', '▣'],
    ['shipping-delivery', 'Shipping & Delivery', '⌁'], ['notifications', 'Notifications', '♧'],
    ['security', 'Security', '◈'], ['store-preferences', 'Store Preferences', '⚙']
  ];
  const jumpTo = (id) => { setActiveSection(id); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const save = (event) => { event.preventDefault(); showToast('Settings saved for this preview.'); };
  const field = (label, value, type = 'text', extra = {}) => <label className="settings-field"><span>{label}</span><input type={type} defaultValue={value} {...extra} /></label>;
  const selectField = (label, value, options) => <label className="settings-field"><span>{label}</span><select defaultValue={value}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
  const toggle = (title, detail, on = true) => <label className="settings-toggle-row"><span><b>{title}</b><small>{detail}</small></span><input className="settings-toggle" type="checkbox" defaultChecked={on} /></label>;
  return <div className="settings-page">
    <header className="settings-page-head"><div><h1>Settings</h1><p>Sharma Enterprises · Seller account</p></div><span className="settings-account-chip"><i></i> Seller account</span></header>
    <form className="settings-layout" onSubmit={save}>
      <aside className="settings-nav card"><div className="settings-nav-title">SETTINGS</div>{sections.map(([id, label, icon]) => <button type="button" key={id} className={activeSection === id ? 'settings-nav-item active' : 'settings-nav-item'} onClick={() => jumpTo(id)}><span>{icon}</span>{label}<b>›</b></button>)}<div className="settings-nav-help"><span>Need a hand?</span><small>Our seller support team is here to help.</small><button type="button" onClick={() => showToast('Seller support is ready to help.')}>Contact support →</button></div></aside>
      <main className="settings-main">
        <section className="settings-card card" id="store-profile"><div className="settings-card-heading"><div><span className="settings-section-kicker">YOUR STOREFRONT</span><h2>Store Profile</h2><p>Manage the details customers see when they visit your store.</p></div><span className="settings-live"><i></i> Live</span></div>
          <div className="settings-logo-row"><div className="settings-logo">SE</div><div><b>Store logo</b><small>Upload a square image. PNG or JPG, up to 5 MB.</small></div><label className="settings-upload">{logoName || 'Upload logo'}<input type="file" accept="image/png,image/jpeg" onChange={(event) => setLogoName(event.target.files?.[0]?.name || '')} /></label></div>
          <div className="settings-fields">{field('Store name', 'Sharma Enterprises')}{field('Store phone number', '+91 98765 43210', 'tel')}{field('Store email', 'hello@sharmaenterprises.in', 'email')}</div>
          <label className="settings-field settings-full-field"><span>Store description</span><textarea defaultValue="Quality fashion and lifestyle products, thoughtfully selected for everyday living." rows="3" /></label><div className="settings-card-actions"><button type="button" className="btn btn-primary" onClick={() => showToast('Store profile is ready to edit.')}>Edit Profile</button></div>
        </section>
        <section className="settings-card card" id="business-information"><div className="settings-card-heading"><div><span className="settings-section-kicker">VERIFIED BUSINESS</span><h2>Business Information</h2><p>Your registered business details for tax and compliance.</p></div><span className="settings-verified">✓ Verified</span></div><div className="settings-fields">{field('Business / company name', 'Sharma Enterprises')}{field('GSTIN', '27ABCDE1234F1Z5')}{field('PAN', 'ABCDE1234F')}{field('Business address', 'Shop 12, Market Road')}{field('City', 'Mumbai')}{field('State', 'Maharashtra')}{field('Pincode', '400001')}</div><div className="settings-card-actions"><button type="button" className="btn btn-outline" onClick={() => showToast('Business details are ready to edit.')}>Edit Business Details</button></div></section>
        <section className="settings-card card" id="account-information"><div className="settings-card-heading"><div><span className="settings-section-kicker">LOGIN & CONTACT</span><h2>Account Information</h2><p>Contact details and account identity for your seller login.</p></div></div><div className="settings-fields">{field('Account holder', 'Sharma Enterprises')}{field('Login email', 'hello@sharmaenterprises.in', 'email')}{field('Mobile number', '+91 98765 43210', 'tel')}{field('Seller ID', 'NX-SELL-20481', 'text', { readOnly: true })}</div><div className="settings-inline-note">Changes to your login email or phone may require verification.</div></section>
        <section className="settings-card card" id="payments-bank"><div className="settings-card-heading"><div><span className="settings-section-kicker">SETTLEMENT DETAILS</span><h2>Payments & Bank</h2><p>Bank account used to receive your seller settlements.</p></div><span className="settings-verified">✓ Verified</span></div><div className="settings-fields">{field('Bank account holder', 'Sharma Enterprises')}{field('Bank name', 'HDFC Bank')}{field('Account number', '•••• •••• •••• 4821', 'text', { readOnly: true })}{field('IFSC code', 'HDFC0001234')}</div><div className="settings-card-actions"><button type="button" className="btn btn-outline" onClick={() => showToast('Bank detail update request started.')}>Update Bank Details</button></div></section>
        <section className="settings-card card" id="shipping-delivery"><div className="settings-card-heading"><div><span className="settings-section-kicker">ORDER FULFILMENT</span><h2>Shipping & Delivery</h2><p>Set up where orders ship from and how quickly they are prepared.</p></div></div><div className="settings-fields">{field('Pickup address', 'Shop 12, Market Road, Mumbai')}{selectField('Delivery partner', 'NexaShip', ['NexaShip', 'Shiprocket', 'Delhivery', 'Other'])}{selectField('Shipping method', 'Standard delivery', ['Standard delivery', 'Express delivery'])}{selectField('Processing time', '1–2 business days', ['Same day', '1–2 business days', '3–5 business days'])}</div><div className="settings-subheading">Return shipping</div><div className="settings-choice-row"><span><b>Use the pickup address for returns</b><small>Returned items will be sent to your registered pickup address.</small></span><input className="settings-toggle" type="checkbox" defaultChecked /></div></section>
        <section className="settings-card card" id="notifications"><div className="settings-card-heading"><div><span className="settings-section-kicker">STAY UP TO DATE</span><h2>Notifications</h2><p>Choose which seller updates you receive and where they arrive.</p></div></div><div className="settings-notification-head"><span>Notification type</span><b>Email</b><b>SMS / WhatsApp</b></div>{[['New order notifications','Get notified as soon as a customer places an order.'],['Payment notifications','Know when a settlement is processed.'],['Return / refund notifications','Updates when a return or refund needs your attention.'],['Low stock alerts','A reminder when products are running low.'],['Promotional notifications','Seller tips, offers and platform announcements.']].map(([title, detail], index) => <div className="settings-notification-row" key={title}><span><b>{title}</b><small>{detail}</small></span><input aria-label={`${title} email`} type="checkbox" defaultChecked={index < 4} /><input aria-label={`${title} SMS or WhatsApp`} type="checkbox" defaultChecked={index < 3} /></div>)}</section>
        <section className="settings-card card" id="security"><div className="settings-card-heading"><div><span className="settings-section-kicker">PROTECT YOUR ACCOUNT</span><h2>Security</h2><p>Keep your seller account and business information secure.</p></div></div><div className="settings-security-row"><span><b>Password</b><small>Last changed 3 months ago</small></span><button type="button" className="btn btn-outline" onClick={() => showToast('Password change flow opened.')}>Change password</button></div>{toggle('Two-factor authentication','Add an extra verification step when signing in.', false)}<div className="settings-subheading">Recent login activity</div><div className="settings-login-activity"><span className="settings-device-icon">▣</span><span><b>Chrome on Windows · Mumbai, India</b><small>This device · Last active just now</small></span><span className="settings-current-session">Current</span></div><div className="settings-card-actions"><button type="button" className="settings-danger-button" onClick={logOut}>Log out from all devices</button></div></section>
        <section className="settings-card card" id="store-preferences"><div className="settings-card-heading"><div><span className="settings-section-kicker">PERSONALISE YOUR STORE</span><h2>Store Preferences</h2><p>Choose the defaults that work best for your business.</p></div></div><div className="settings-fields">{selectField('Currency', 'INR (₹)', ['INR (₹)', 'USD ($)'])}{selectField('Language', 'English', ['English', 'हिन्दी'])}{selectField('Time zone', 'India Standard Time (IST)', ['India Standard Time (IST)', 'UTC'])}{selectField('Store visibility', 'Public', ['Public', 'Private'])}</div>{toggle('Auto-confirm orders','Confirm new orders automatically when inventory is available.', false)}</section>
        <div className="settings-savebar"><span><b>All changes are saved for this session</b><small>Save your settings when you are ready.</small></span><button className="btn btn-primary" type="submit">Save Changes</button></div>
      </main>
    </form>
  </div>;
}
function Placeholder({ page, navigate }) { const data = { orders:['Orders are on their way','Your latest orders will show up here. You have 12 orders ready to pack.','View orders'],payments:['Your payments at a glance','Track settlements, transactions and bank details from one place.','View settlements'],store:['Your store is live','Your NexaSeller storefront is open to customers across India.','Manage store'],reports:['Insights for your business','Sales and tax reports help you make your next move with confidence.','Explore reports'],settings:['Store settings','Keep your business details and preferences up to date.','Edit settings'] }[page]; return <><div className="page-head"><div><h1>{pages[page]}</h1><p>Sharma Enterprises · Seller account</p></div></div><article className="card placeholder"><div className="placeholder-icon">{page==='orders'?'♧':page==='payments'?'▣':page==='store'?'⌂':page==='reports'?'⌁':'⚙'}</div><h2>{data[0]}</h2><p>{data[1]}</p><button className="btn btn-primary" onClick={() => navigate(page==='orders'?'orders':page==='payments'?'payments':'products')}>{data[2]} &nbsp;→</button></article></>; }

export default App;



