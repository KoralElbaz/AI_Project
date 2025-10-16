const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// יצירת מסד נתונים SQLite
const dbPath = path.join(__dirname, 'contacts.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initializeDatabase();
  }
});

// אתחול מסד הנתונים ויצירת טבלאות
function initializeDatabase() {
  const createContactsTable = `
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.run(createContactsTable, (err) => {
    if (err) {
      console.error('Error creating contacts table:', err.message);
    } else {
      console.log('Contacts table created or already exists');
      // הוספת נתונים לדוגמה אם הטבלה ריקה
      insertSampleData();
    }
  });
}

// הוספת נתונים לדוגמה
function insertSampleData() {
  db.get("SELECT COUNT(*) as count FROM contacts", (err, row) => {
    if (err) {
      console.error('Error checking contacts count:', err.message);
      return;
    }

    if (row.count === 0) {
      const sampleContacts = [
        ['יוסי כהן', '050-1234567', 'yossi@example.com', 'רחוב הרצל 10, תל אביב'],
        ['שרה לוי', '052-9876543', 'sara@example.com', 'רחוב דיזנגוף 25, תל אביב'],
        ['דוד ישראלי', '053-5555555', 'david@example.com', 'רחוב אבן גבירול 15, ירושלים'],
        ['רחל גולדברג', '054-1111111', 'rachel@example.com', 'רחוב אלנבי 30, חיפה'],
        ['משה אברהם', '055-2222222', 'moshe@example.com', 'רחוב שדרות בן גוריון 5, באר שבע']
      ];

      const insertStatement = db.prepare(`
        INSERT INTO contacts (name, phone, email, address) 
        VALUES (?, ?, ?, ?)
      `);

      sampleContacts.forEach(contact => {
        insertStatement.run(contact, (err) => {
          if (err) {
            console.error('Error inserting sample contact:', err.message);
          }
        });
      });

      insertStatement.finalize((err) => {
        if (err) {
          console.error('Error finalizing insert statement:', err.message);
        } else {
          console.log('Sample contacts inserted successfully');
        }
      });
    }
  });
}

// פונקציה לסגירת מסד הנתונים
function closeDatabase() {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
  });
}

module.exports = {
  db,
  closeDatabase
};
