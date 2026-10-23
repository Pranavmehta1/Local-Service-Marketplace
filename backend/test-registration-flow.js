const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();

function req(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const r = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
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

async function run() {
  console.log('=== TEST SUITE: REGISTRATION COUNTING & RESET SYSTEM ===');

  console.log('\n[1] Verifying Post-Reset State (Expect 0 Customers, 0 Workers):');
  let s = await req('/api/platform/stats');
  console.log('Stats:', {
    customers: s.data.registeredCustomers,
    workers: s.data.registeredWorkers,
    users: s.data.registeredUsers
  });
  if (s.data.registeredCustomers !== 0 || s.data.registeredWorkers !== 0) {
    throw new Error('Initial counts not zero!');
  }

  console.log('\n[2] Registering 1 Customer (Expect Customers: 1, Workers: 0):');
  const custRes = await req('/api/auth/register/customer', 'POST', {
    name: 'Pranav Customer',
    email: 'pranav_test_real@localfix.com',
    phone: '9876543210',
    password: 'password123',
    location: 'Model Town, Ludhiana'
  });
  console.log('Signup status:', custRes.status, 'User:', custRes.data.user?.email);
  s = await req('/api/platform/stats');
  console.log('Stats after customer signup:', {
    customers: s.data.registeredCustomers,
    workers: s.data.registeredWorkers
  });
  if (s.data.registeredCustomers !== 1 || s.data.registeredWorkers !== 0) {
    throw new Error('Customer count did not increment to 1!');
  }

  console.log('\n[3] Testing Duplicate Customer Signup (Expect 409 Conflict & Counts Unchanged):');
  const dupCustRes = await req('/api/auth/register/customer', 'POST', {
    name: 'Duplicate Pranav',
    email: 'pranav_test_real@localfix.com',
    phone: '9876543211',
    password: 'password123'
  });
  console.log('Duplicate status:', dupCustRes.status, 'Message:', dupCustRes.data.message);
  s = await req('/api/platform/stats');
  console.log('Stats after duplicate attempt (must remain 1):', {
    customers: s.data.registeredCustomers,
    workers: s.data.registeredWorkers
  });
  if (s.data.registeredCustomers !== 1) {
    throw new Error('Customer count incorrectly incremented on duplicate signup!');
  }

  console.log('\n[4] Registering 1 Service Worker (Expect Customers: 1, Workers: 1):');
  const wrkRes = await req('/api/auth/register/worker', 'POST', {
    name: 'Ramesh Electrician',
    email: 'ramesh_test_real@localfix.com',
    phone: '9876543220',
    password: 'password123',
    serviceCategory: 'electrician',
    serviceArea: 'Model Town, Ludhiana',
    experience: 4,
    startingPrice: 200
  });
  console.log('Worker signup status:', wrkRes.status, 'Worker:', wrkRes.data.user?.email);
  s = await req('/api/platform/stats');
  console.log('Stats after worker signup:', {
    customers: s.data.registeredCustomers,
    workers: s.data.registeredWorkers
  });
  if (s.data.registeredWorkers !== 1) {
    throw new Error('Worker count did not increment to 1!');
  }

  console.log('\n[5] Testing Customer Sign-In (Expect Counts to NOT Change):');
  const loginRes = await req('/api/auth/login', 'POST', {
    email: 'pranav_test_real@localfix.com',
    password: 'password123'
  });
  console.log('Customer login status:', loginRes.status, 'Role:', loginRes.data.user?.role);
  s = await req('/api/platform/stats');
  console.log('Stats after customer sign-in (must remain Customers: 1, Workers: 1):', {
    customers: s.data.registeredCustomers,
    workers: s.data.registeredWorkers
  });
  if (s.data.registeredCustomers !== 1 || s.data.registeredWorkers !== 1) {
    throw new Error('Counts altered during customer login!');
  }

  console.log('\n[6] Testing Admin Login & Verification (Admin Excluded from Customer/Worker Counts):');
  const adminRes = await req('/api/auth/login', 'POST', {
    email: 'admin@localfix.com',
    password: 'admin123'
  });
  console.log('Admin login status:', adminRes.status, 'Role:', adminRes.data.user?.role);
  s = await req('/api/platform/stats');
  console.log('Stats after admin login (must remain Customers: 1, Workers: 1):', {
    customers: s.data.registeredCustomers,
    workers: s.data.registeredWorkers
  });
  if (s.data.registeredCustomers !== 1 || s.data.registeredWorkers !== 1) {
    throw new Error('Admin account incorrectly counted!');
  }

  console.log('\n[7] Cleaning Test Accounts to leave Clean 0 Database State:');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/localfix');
  await mongoose.connection.db.collection('users').deleteMany({ role: { $in: ['customer', 'worker'] } });
  await mongoose.connection.db.collection('workers').deleteMany({});
  s = await req('/api/platform/stats');
  console.log('Final Clean Stats (Expect Customers: 0, Workers: 0):', {
    customers: s.data.registeredCustomers,
    workers: s.data.registeredWorkers,
    users: s.data.registeredUsers
  });
  if (s.data.registeredCustomers !== 0 || s.data.registeredWorkers !== 0) {
    throw new Error('Final reset did not reach zero!');
  }

  console.log('\n>>> ALL 7 TESTS PASSED SUCCESSFULLY! <<<');
  process.exit(0);
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
