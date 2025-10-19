const express = require('express');
const cors = require('cors');
const { db } = require('./database');
const app = express();
const port = 3000;

// Middleware להפעלת CORS
app.use(cors({
  origin: 'http://localhost:4200', // Angular development server
  credentials: true
}));

// Middleware לפענוח JSON
app.use(express.json());

// Import routes
const contactsRouter = require('./routes/contacts');
const outgoingChecksRouter = require('./routes/outgoing-checks');
const incomingChecksRouter = require('./routes/incoming-checks');
const dashboardRouter = require('./routes/dashboard');

// Routes
app.use('/api/contacts', contactsRouter);
app.use('/api/outgoing-checks', outgoingChecksRouter);
app.use('/api/incoming-checks', incomingChecksRouter);
app.use('/api/dashboard', dashboardRouter);

app.get('/api/hello', (req, res) => {
  console.log('Received GET request to /api/hello');
  console.log('Headers:', req.headers);
  res.json({ message: 'שלום מהשרת! הקשר בין האנגולר לשרת עובד!' });
});

// Route לבדיקה שהשרת עובד
app.get('/', (req, res) => {
  res.json({ status: 'Server is running!', timestamp: new Date().toISOString() });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Shutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});

app.listen(port, () => {
  console.log(`🚀 Server listening at http://localhost:${port}`);
  console.log(`📊 Contacts API available at http://localhost:${port}/api/contacts`);
});