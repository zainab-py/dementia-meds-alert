// server.js - Main server file for medication tracking with notifications

const express = require('express');
const path = require('path');
const cors = require('cors');
const alertScheduler = require('./alertScheduler.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Routes
app.use('/api/medications', require('./medications.cjs'));

// Serve the demo page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'medication-demo.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    alertScheduler: alertScheduler.isRunning ? 'running' : 'stopped'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Medication Tracker Server running on http://localhost:${PORT}`);
  console.log(`📊 Demo available at: http://localhost:${PORT}`);
  
  // Start the alert scheduler
  alertScheduler.start();
  
  console.log('✅ Notification system initialized');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  alertScheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  alertScheduler.stop();
  process.exit(0);
});

module.exports = app;
