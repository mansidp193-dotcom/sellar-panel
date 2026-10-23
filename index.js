import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const app = express();
const port = process.env.PORT || 4000;
const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, '../dist');
const userDataDir = path.join(here, 'data');
const userDataFile = path.join(userDataDir, 'users.json');
const scrypt = promisify(scryptCallback);
const sessions = new Map();
const sessionCookie = 'nexaseller_session';

app.use(express.json());

await mkdir(userDataDir, { recursive: true });
let users = [];
try {
  users = JSON.parse(await readFile(userDataFile, 'utf8'));
  if (!Array.isArray(users)) users = [];
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  await writeFile(userDataFile, '[]\n', 'utf8');
}

function safeUser(user) { return { id: user.id, email: user.email, fullName: user.fullName, storeName: user.storeName, verified: false }; }
function requestSession(req) {
  const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map((part) => part.trim().split('=').map(decodeURIComponent)).filter((part) => part.length === 2));
  const userId = sessions.get(cookies[sessionCookie]);
  return users.find((user) => user.id === userId);
}
function setSession(res, user) {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, user.id);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${sessionCookie}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${secure}`);
}
function clearSession(req, res) {
  const user = requestSession(req);
  const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map((part) => part.trim().split('=').map(decodeURIComponent)).filter((part) => part.length === 2));
  sessions.delete(cookies[sessionCookie]);
  res.setHeader('Set-Cookie', `${sessionCookie}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  return user;
}
function requireAuth(req, res, next) {
  const user = requestSession(req);
  if (!user) return res.status(401).json({ error: 'Please sign in to continue.' });
  req.seller = user;
  return next();
}
async function saveUsers() { await writeFile(userDataFile, `${JSON.stringify(users, null, 2)}\n`, 'utf8'); }

app.get('/api/auth/me', (req, res) => {
  const user = requestSession(req);
  res.json({ authenticated: Boolean(user), user: user ? safeUser(user) : null });
});
app.post('/api/auth/register', async (req, res) => {
  const { email, password, fullName, storeName } = req.body ?? {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!fullName?.trim() || !storeName?.trim() || !/^\S+@\S+\.\S+$/.test(normalizedEmail) || String(password || '').length < 8) {
    return res.status(400).json({ error: 'Enter your name, store name, a valid email, and a password with at least 8 characters.' });
  }
  if (users.some((user) => user.email === normalizedEmail)) return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
  const salt = randomBytes(16).toString('hex');
  const passwordHash = (await scrypt(password, salt, 64)).toString('hex');
  const user = { id: randomUUID(), email: normalizedEmail, fullName: fullName.trim(), storeName: storeName.trim(), salt, passwordHash, createdAt: new Date().toISOString() };
  users.push(user);
  try { await saveUsers(); } catch { users = users.filter((item) => item.id !== user.id); return res.status(500).json({ error: 'Could not save this account. Please try again.' }); }
  setSession(res, user);
  return res.status(201).json({ user: safeUser(user) });
});
app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const user = users.find((item) => item.email === email);
  if (!user) return res.status(401).json({ error: 'Email or password is incorrect.' });
  const candidate = (await scrypt(password, user.salt, 64));
  const stored = Buffer.from(user.passwordHash, 'hex');
  if (candidate.length !== stored.length || !timingSafeEqual(candidate, stored)) return res.status(401).json({ error: 'Email or password is incorrect.' });
  setSession(res, user);
  return res.json({ user: safeUser(user) });
});
app.post('/api/auth/logout', (req, res) => { clearSession(req, res); res.json({ ok: true }); });

// Starter data lives in memory. Replace this store with a database when ready.
let products = [
  { id: 1, name: 'Handmade Cotton Kurti', sku: 'KUR-2048', category: 'Fashion & Apparel', price: 599, stock: 20, status: 'Live', icon: '👚', bg: '#f6ede2', sold: 25 },
  { id: 2, name: 'Homemade Mango Pickle', sku: 'FOD-1024', category: 'Food & Grocery', price: 249, stock: 45, status: 'Live', icon: '🫙', bg: '#f8eddb', sold: 18 },
  { id: 3, name: 'Jewellery Set (Kundan)', sku: 'JW-0083', category: 'Jewellery', price: 299, stock: 15, status: 'Low stock', icon: '💍', bg: '#f1e9e2', sold: 9 },
  { id: 4, name: 'Traditional Masala Papad', sku: 'FOD-0921', category: 'Food & Grocery', price: 129, stock: 62, status: 'Live', icon: '🥙', bg: '#f5eee1', sold: 14 },
  { id: 5, name: 'Organic Rose Face Mist', sku: 'BEA-3320', category: 'Beauty & Personal Care', price: 349, stock: 0, status: 'Draft', icon: '🌹', bg: '#f8e9ed', sold: 0 },
  { id: 6, name: 'Block Print Cushion Cover', sku: 'HOM-0710', category: 'Home & Kitchen', price: 399, stock: 32, status: 'Live', icon: '🪡', bg: '#f2eee7', sold: 7 },
  { id: 7, name: 'Brass Diya Pair', sku: 'HOM-0105', category: 'Home & Kitchen', price: 499, stock: 6, status: 'Low stock', icon: '🪔', bg: '#f5eedc', sold: 11 },
  { id: 8, name: 'Handwoven Jute Tote', sku: 'BAG-4220', category: 'Fashion & Apparel', price: 449, stock: 28, status: 'Live', icon: '👜', bg: '#eee9df', sold: 13 },
];
let returns = [
  { id: 'RET-38142', orderId: 'NEX-88219', awb: 'DEL-290184775', sku: 'KUR-2048', product: 'Handmade Cotton Kurti', customer: 'Priya Mehta', returnedAt: '2026-09-28', reason: 'Size does not fit', refundAmount: 599, status: 'Requested', icon: '👚', bg: '#f6ede2' },
  { id: 'RET-38107', orderId: 'NEX-88176', awb: 'XPR-741190238', sku: 'FOD-1024', product: 'Homemade Mango Pickle', customer: 'Rohan Shah', returnedAt: '2026-09-27', reason: 'Item damaged in transit', refundAmount: 249, status: 'In transit', icon: '🫙', bg: '#f8eddb' },
  { id: 'RET-38088', orderId: 'NEX-88094', awb: 'DEL-290184221', sku: 'JW-0083', product: 'Jewellery Set (Kundan)', customer: 'Ananya Rao', returnedAt: '2026-09-26', reason: 'Different from description', refundAmount: 299, status: 'Received', icon: '💍', bg: '#f1e9e2' },
  { id: 'RET-38013', orderId: 'NEX-87911', awb: 'BLU-614882003', sku: 'HOM-0710', product: 'Block Print Cushion Cover', customer: 'Kabir Joshi', returnedAt: '2026-09-24', reason: 'Changed my mind', refundAmount: 399, status: 'Refunded', icon: '🪡', bg: '#f2eee7' },
  { id: 'RET-37952', orderId: 'NEX-87720', awb: 'DEL-290183009', sku: 'FOD-0921', product: 'Traditional Masala Papad', customer: 'Neha Kulkarni', returnedAt: '2026-09-22', reason: 'Package missing an item', refundAmount: 129, status: 'Rejected', icon: '🥙', bg: '#f5eee1' },
];
let orders = [
  { id: 'ORD-594948889415', orderNo: '594948889415', date: '2026-09-28T09:24:00', product: 'Dwarakesh Enterprise’s New Attractive Printed Full Sleeve Shirt', quantity: 1, size: 'XL', sku: '162144266', marketplaceId: '3H5G2G7A2', subOrderId: '594948889415_1', dispatchDate: '2026-10-01', sla: 'Breaching soon', status: 'Pending', price: 649, image: '👕', bg: '#eceaf0' },
  { id: 'ORD-375345182341', orderNo: '375345182341', date: '2026-09-28T09:35:00', product: 'Mani’s Kurta', quantity: 1, size: 'XL', sku: 'mirror-YELLOW', marketplaceId: '1F2A5H9A2', subOrderId: '375345182341_1', dispatchDate: '2026-10-02', sla: 'On track', status: 'Pending', price: 799, image: '👘', bg: '#fff1a6' },
  { id: 'ORD-569783651551', orderNo: '569783651551', date: '2026-09-28T09:34:00', product: 'Men’s Kurta', quantity: 1, size: 'XL', sku: 'mirror-YELLOW', marketplaceId: '1F2A5H9A2', subOrderId: '569783651551_1', dispatchDate: '2026-10-02', sla: 'On track', status: 'Pending', price: 799, image: '👘', bg: '#fff1a6' },
  { id: 'ORD-874120326104', orderNo: '874120326104', date: '2026-09-27T18:10:00', product: 'Handmade Cotton Kurti', quantity: 1, size: 'M', sku: 'KUR-2048', marketplaceId: 'NEX-88219', subOrderId: '874120326104_1', dispatchDate: '2026-09-30', sla: 'On track', status: 'Ready to Ship', price: 599, image: '👚', bg: '#f6ede2' },
  { id: 'ORD-327041680322', orderNo: '327041680322', date: '2026-09-26T16:42:00', product: 'Homemade Mango Pickle', quantity: 2, size: '—', sku: 'FOD-1024', marketplaceId: 'NEX-88176', subOrderId: '327041680322_1', dispatchDate: '2026-09-29', sla: 'Shipped', status: 'Shipped', price: 498, image: '🫙', bg: '#f8eddb' },
];
const paymentData = {
  upcoming: { label: 'Next 7 days', total: 13918, dates: [{ day:'7 Oct', amount:3188 },{ day:'9 Oct', amount:4720 },{ day:'12 Oct', amount:6010 }], orders: 14 },
  completed: { label: 'Last 30 days', total: 20780, dates: [{ day:'6 Sep', amount:7316 },{ day:'18 Sep', amount:6248 },{ day:'25 Sep', amount:7216 }], orders: 42 },
  lines: {
    upcoming: [
      { type: 'Orders', detail: 'Sales and returns', amount: 13818 },
      { type: 'Net platform recovery', detail: 'Ads cost', amount: 0 },
      { type: '', detail: 'Program cost', amount: 0 },
      { type: 'Net platform compensation', detail: 'Program benefits', amount: 100 },
      { type: '', detail: 'Referral earnings', amount: 0 },
    ],
    completed: [
      { type: 'Orders', detail: 'Sales and returns', amount: 20680 },
      { type: 'Net platform recovery', detail: 'Ads cost', amount: 0 },
      { type: '', detail: 'Program cost', amount: 0 },
      { type: 'Net platform compensation', detail: 'Program benefits', amount: 100 },
      { type: '', detail: 'Referral earnings', amount: 0 },
    ],
  },
  transactions: [
    { orderNo:'594948889415', subOrderNo:'594948889415_1', date:'2026-10-07', amount:3188, status:'Upcoming' },
    { orderNo:'375345182341', subOrderNo:'375345182341_1', date:'2026-10-09', amount:4720, status:'Upcoming' },
    { orderNo:'569783651551', subOrderNo:'569783651551_1', date:'2026-10-12', amount:6010, status:'Upcoming' },
    { orderNo:'874120326104', subOrderNo:'874120326104_1', date:'2026-09-06', amount:7316, status:'Completed' },
    { orderNo:'327041680322', subOrderNo:'327041680322_1', date:'2026-09-18', amount:6248, status:'Completed' },
    { orderNo:'NEX-88219', subOrderNo:'NEX-88219_1', date:'2026-09-25', amount:7216, status:'Completed' },
  ],
};

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/dashboard', requireAuth, (req, res) => res.json({
  seller: { name: req.seller.fullName, business: req.seller.storeName, verified: true },
  metrics: { revenue: 24850, orders: 38, settlement: 52400, visits: 2840, weeklyRevenue: 142890 },
  pipeline: { new: 12, packed: 18, transit: 24, delivered: 31 },
  actions: [
    { id: 'pack', title: '12 orders ready to pack', detail: 'Pickup in 1h 45m · Delivery', action: 'Process orders', icon: '▣' },
    { id: 'stock', title: '6 items running low', detail: 'Cotton Kurti (12 left) · Brass Diya (6 left)', action: 'Review stock', icon: '▧' },
    { id: 'queries', title: '2 customer queries', detail: 'Size exchange inquiry on order #NEX-88219', action: 'Reply', icon: '▱' },
  ],
}));
app.get('/api/products', requireAuth, (req, res) => {
  const { q = '', category = 'all', status = 'all' } = req.query;
  const filtered = products.filter((product) => {
    const matchesText = `${product.name} ${product.sku}`.toLowerCase().includes(String(q).toLowerCase());
    return matchesText && (category === 'all' || product.category === category) && (status === 'all' || product.status === status);
  });
  res.json(filtered);
});
app.get('/api/returns', requireAuth, (req, res) => {
  const { q = '', status = 'all', tab = 'overview' } = req.query;
  const needle = String(q).toLowerCase();
  const filtered = returns.filter((item) => {
    const matchesSearch = [item.orderId, item.awb, item.sku, item.product, item.customer].some((value) => value.toLowerCase().includes(needle));
    const matchesStatus = status === 'all' || item.status.toLowerCase() === String(status).toLowerCase();
    const matchesTab = tab !== 'claims' || ['Rejected', 'Refunded'].includes(item.status);
    return matchesSearch && matchesStatus && matchesTab;
  });
  res.json({ summary: { customerReturnRate: '10.58%', customerReturned: '11 of 104 delivered', courierReturnRate: '9.38%', courierReturned: '18 RTO orders out of 192 dispatched', wrongDefectiveRate: '8.82%', standardReturnRate: '9.68%', claimApproval: '80%' }, returns: filtered });
});
app.post('/api/returns/:id/action', requireAuth, (req, res) => {
  const item = returns.find((entry) => entry.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Return order not found.' });
  const transitions = { approve: ['Requested', 'Approved'], reject: ['Requested', 'Rejected'], pickup: ['Approved', 'In transit'], receive: ['In transit', 'Received'], refund: ['Received', 'Refunded'] };
  const transition = transitions[req.body?.action];
  if (!transition || item.status !== transition[0]) return res.status(400).json({ error: 'That action is not available for this return.' });
  item.status = transition[1];
  return res.json({ return: item });
});
app.get('/api/orders', requireAuth, (req, res) => {
  const { q = '', status = 'Pending', field = 'all' } = req.query;
  const needle = String(q).toLowerCase();
  const fields = { 'Order ID': ['orderNo'], 'SKU ID': ['sku'], 'Marketplace ID': ['marketplaceId'], 'Sub-order ID': ['subOrderId'] }[field] || ['orderNo', 'sku', 'marketplaceId', 'subOrderId', 'product'];
  const counts = Object.fromEntries(['On Hold', 'Pending', 'Ready to Ship', 'Shipped'].map((name) => [name, orders.filter((order) => order.status === name).length]));
  const filtered = orders.filter((order) => (status === 'All' || order.status === status) && fields.some((key) => order[key].toLowerCase().includes(needle)));
  res.json({ orders: filtered, counts });
});
app.post('/api/orders/:id/action', requireAuth, (req, res) => {
  const order = orders.find((entry) => entry.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  const action = req.body?.action;
  if (order.status !== 'Pending' || !['accept', 'cancel'].includes(action)) return res.status(400).json({ error: 'This order can no longer be changed.' });
  order.status = action === 'accept' ? 'Ready to Ship' : 'Cancelled';
  return res.json({ order });
});
app.post('/api/orders/bulk-action', requireAuth, (req, res) => {
  const { ids = [], action } = req.body ?? {};
  if (!Array.isArray(ids) || !['accept', 'cancel'].includes(action)) return res.status(400).json({ error: 'Choose valid orders and an action.' });
  const changed = orders.filter((order) => ids.includes(order.id) && order.status === 'Pending');
  changed.forEach((order) => { order.status = action === 'accept' ? 'Ready to Ship' : 'Cancelled'; });
  return res.json({ orders: changed, count: changed.length });
});
app.get('/api/payments', requireAuth, (req, res) => {
  const { q = '', period = '30 days' } = req.query;
  const needle = String(q).toLowerCase();
  const transactions = paymentData.transactions.filter((transaction) => `${transaction.orderNo} ${transaction.subOrderNo}`.toLowerCase().includes(needle));
  res.json({ upcoming: paymentData.upcoming, completed: { ...paymentData.completed, label: period === 'This month' ? 'This month' : period === 'Last 3 months' ? 'Last 3 months' : 'Last 30 days' }, lines: paymentData.lines, transactions, unshipped: { orders: 8, estimated: 6840 } });
});
app.post('/api/products', requireAuth, (req, res) => {
  const { name, category, price, stock, sku = '' } = req.body ?? {};
  if (!name?.trim() || !Number.isFinite(Number(price)) || Number(price) < 1 || !Number.isFinite(Number(stock)) || Number(stock) < 0) {
    return res.status(400).json({ error: 'Enter a product name, a valid price and a valid stock quantity.' });
  }
  const product = {
    id: Date.now(), name: name.trim(), sku: sku.trim() || `NX-${String(Date.now()).slice(-5)}`,
    category: category || 'Other', price: Number(price), stock: Number(stock),
    status: Number(stock) === 0 ? 'Draft' : Number(stock) < 10 ? 'Low stock' : 'Live',
    icon: '📦', bg: '#eef0f8', sold: 0,
  };
  products = [product, ...products];
  return res.status(201).json(product);
});
app.post('/api/actions/:action', requireAuth, (req, res) => {
  const messages = { process: '12 orders moved to processing.', pack: '12 orders moved to processing.', manifest: 'Courier manifest created.', reply: 'Customer conversation opened.', queries: 'Customer conversation opened.' };
  res.json({ message: messages[req.params.action] || 'Action completed.' });
});

// In production, Express serves the built React app from /dist.
app.use(express.static(dist));
app.get(/.*/, (_req, res, next) => {
  res.sendFile(path.join(dist, 'index.html'), (error) => error && next());
});

app.listen(port, () => console.log(`NexaSeller API listening on http://localhost:${port}`));
