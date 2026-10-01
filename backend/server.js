const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const { initDatabase } = require('./database/database');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const resourcesRoutes = require('./routes/resources');
const alertsRoutes = require('./routes/alerts');
const eventsRoutes = require('./routes/events');
const reportsRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    awsConfigured: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_ACCESS_KEY_ID !== 'YOUR_ACCESS_KEY'),
    region: process.env.AWS_REGION || 'ap-south-1'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', resourcesRoutes);
app.use('/api', alertsRoutes);
app.use('/api', eventsRoutes);
app.use('/api', reportsRoutes);

// Catch-all route to serve index.html for frontend single page navigation if applicable
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected security monitor error occurred'
  });
});

// Initialize SQLite Database and Start Server
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(`Cloud Security Monitoring Backend Active`);
      console.log(`Server URL: http://localhost:${PORT}`);
      console.log(`AWS Region Target: ${process.env.AWS_REGION || 'ap-south-1'}`);
      console.log(`Live AWS Mode: ${process.env.AWS_ACCESS_KEY_ID && process.env.AWS_ACCESS_KEY_ID !== 'YOUR_ACCESS_KEY' ? 'CONFIGURED' : 'DEMO / SIMULATED MODE'}`);
      console.log(`==================================================`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
