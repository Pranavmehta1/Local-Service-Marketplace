const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const workerRoutes = require('./routes/workerRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const otpRoutes = require('./routes/otpRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// API health and endpoints
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'LocalFix API' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/otp', otpRoutes);

// Serve frontend static files
const frontendDir = path.resolve(__dirname, '../frontend');
app.use(express.static(frontendDir));

// Clean URL support for /pages/...
app.get('/pages/:page', (req, res, next) => {
  const filePath = path.join(frontendDir, 'pages', `${req.params.page}.html`);
  if (fs.existsSync(filePath)) return res.sendFile(filePath);
  next();
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const direct = path.join(frontendDir, req.path);
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return res.sendFile(direct);
  const withHtml = path.join(frontendDir, `${req.path}.html`);
  if (fs.existsSync(withHtml)) return res.sendFile(withHtml);
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`LocalFix API running on port ${PORT}`));
});
