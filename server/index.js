const express = require('express');
const app = express();
const port = 3000;

// Middleware להפעלת CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  // טיפול ב-OPTIONS request
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Middleware לפענוח JSON
app.use(express.json());

app.get('/api/hello', (req, res) => {
  console.log('Received GET request to /api/hello');
  console.log('Headers:', req.headers);
  res.json({ message: 'שלום מהשרת! הקשר בין האנגולר לשרת עובד!' });
});

// Route לבדיקה שהשרת עובד
app.get('/', (req, res) => {
  res.json({ status: 'Server is running!', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});