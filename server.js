require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { WebSocketServer } = require('ws');
const { connectDB } = require('./config/db');

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Database connection
connectDB();

// WebSocket setup
const wss = new WebSocketServer({ port: 8080 });
wss.on('connection', (ws) => {
  console.log('New client connected');
  ws.on('close', () => console.log('Client disconnected'));
});

// Routes
app.use('/api', require('./routes/api'));
app.use('/admin', require('./routes/admin'));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server running on port 8080`);
});