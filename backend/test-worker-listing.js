const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();

function req(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const r = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path,
      method,
      headers
    }, res => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(buf || '{}') }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function testWorkerFlow() {
  console.log('=== WORKER LISTING & CATEGORIES VERIFICATION SUITE ===');

  console.log('\n[1] Testing Categories Endpoint (/api/workers/categories):');
  const cats = await req('/api/workers/categories');
  console.log('Categories count:', cats.data.count);
  console.log('Category names:', cats.data.categories.map(c => c.name));
  if (!cats.data.categories || cats.data.categories.length < 5) {
    throw new Error('Categories failed to load from API!');
  }

  console.log('\n[2] Registering a Real Service Worker (/api/auth/register/worker):');
  const regRes = await req('/api/auth/register/worker', 'POST', {
    name: 'Harpreet Singh',
    email: 'harpreet_worker@localfix.com',
    phone: '9812345678',
    password: 'password123',
    serviceCategory: 'electrician',
    serviceArea: 'Model Town, Ludhiana, Punjab',
    experience: 5,
    startingPrice: 250
  });
  console.log('Register worker status:', regRes.status, 'User ID:', regRes.data.user?.id);
  if (regRes.status !== 201) throw new Error('Worker registration failed');

  console.log('\n[3] Checking Worker Listing Before Admin Approval:');
  let list = await req('/api/workers');
  console.log('Public verified workers count (pending worker hidden):', list.data.count);
  if (list.data.count !== 0) throw new Error('Pending worker should not be publicly listed');

  console.log('\n[4] Admin Login & Approving Worker Profile:');
  const adminLogin = await req('/api/auth/login', 'POST', {
    email: 'admin@localfix.com',
    password: 'admin123'
  });
  const adminToken = adminLogin.data.token;
  console.log('Admin login status:', adminLogin.status);

  const pendingList = await req('/api/admin/workers/pending', 'GET', null, adminToken);
  console.log('Pending queue count:', pendingList.data.count);
  const workerDocId = pendingList.data.workers[0]?._id;

  const approveRes = await req('/api/admin/workers/' + workerDocId + '/verify', 'PUT', { decision: 'approved' }, adminToken);
  console.log('Worker approval status:', approveRes.status, 'verificationStatus:', approveRes.data.worker?.verificationStatus);
  if (approveRes.data.worker?.verificationStatus !== 'approved') throw new Error('Worker approval failed');

  console.log('\n[5] Checking Worker Listing After Admin Approval:');
  list = await req('/api/workers');
  console.log('Public verified workers count:', list.data.count);
  console.log('Worker details returned:', {
    name: list.data.workers[0]?.userId?.name,
    category: list.data.workers[0]?.serviceCategory,
    price: list.data.workers[0]?.pricing?.startingPrice,
    area: list.data.workers[0]?.serviceArea
  });
  if (list.data.count !== 1) throw new Error('Approved worker not appearing in public listing');

  console.log('\n[6] Testing Filters on Verified Workers:');
  const elecList = await req('/api/workers?category=electrician');
  console.log('Filter category=electrician -> count:', elecList.data.count);
  const plumbList = await req('/api/workers?category=plumber');
  console.log('Filter category=plumber -> count:', plumbList.data.count);
  if (elecList.data.count !== 1 || plumbList.data.count !== 0) {
    throw new Error('Category filter mismatch');
  }

  console.log('\n[7] Cleaning Test Worker to leave Clean Database:');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/localfix');
  await mongoose.connection.db.collection('users').deleteMany({ role: { $in: ['customer', 'worker'] } });
  await mongoose.connection.db.collection('workers').deleteMany({});
  console.log('Test worker cleaned up.');

  console.log('\n>>> ALL WORKER SEARCH & CATEGORY TESTS PASSED! <<<');
  process.exit(0);
}

testWorkerFlow().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
