const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// יצירת מסד נתונים SQLite
const dbPath = path.join(__dirname, 'contacts.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initializeDatabase();
  }
});

// אתחול מסד הנתונים ויצירת טבלאות
function initializeDatabase() {
  // טבלת עסק (business_account) - שורה אחת בלבד
  const createBusinessAccountTable = `
    CREATE TABLE IF NOT EXISTS business_account (
      id INTEGER PRIMARY KEY DEFAULT 1,
      name TEXT NOT NULL,
      business_id TEXT NOT NULL,
      bank_name TEXT,
      bank_branch TEXT,
      account_number TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT single_business CHECK (id = 1)
    )
  `;

  // טבלת אנשי קשר (contacts) - מעודכנת
  const createContactsTable = `
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('customer', 'supplier', 'both')),
      id_number TEXT,
      phone TEXT,
      email TEXT,
      bank_name TEXT,
      bank_branch TEXT,
      account_number TEXT,
      proxy TEXT,
      is_active BOOLEAN DEFAULT 1,
      is_business BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // טבלת שקים יוצאים (outgoing_checks)
  const createOutgoingChecksTable = `
    CREATE TABLE IF NOT EXISTS outgoing_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      check_number TEXT NOT NULL UNIQUE,
      payee_contact_id INTEGER NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      currency TEXT DEFAULT 'ILS',
      issue_date DATE NOT NULL,
      due_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cleared', 'bounced', 'cancelled', 'in_collection', 'expired')),
      is_series BOOLEAN DEFAULT 0,
      series_id INTEGER,
      series_number INTEGER,
      is_physical BOOLEAN DEFAULT 0,
      image_url TEXT,
      cancellation_reason TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (payee_contact_id) REFERENCES contacts(id)
    )
  `;

  // טבלת שקים נכנסים (incoming_checks)
  const createIncomingChecksTable = `
    CREATE TABLE IF NOT EXISTS incoming_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      check_number TEXT NOT NULL UNIQUE,
      payer_contact_id INTEGER NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      currency TEXT DEFAULT 'ILS',
      issue_date DATE NOT NULL,
      due_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting_deposit' CHECK (status IN ('waiting_deposit', 'deposited', 'cleared', 'bounced', 'endorsed', 'expired', 'cancelled')),
      deposited_at DATETIME,
      deposit_scheduled_date DATE,
      cleared_at DATETIME,
      is_series BOOLEAN DEFAULT 0,
      series_id INTEGER,
      series_number INTEGER,
      is_physical BOOLEAN DEFAULT 0,
      image_url TEXT,
      invoice_number TEXT,
      invoice_issued_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (payer_contact_id) REFERENCES contacts(id)
    )
  `;

  // טבלת סדרות שקים יוצאים (outgoing_series)
  const createOutgoingSeriesTable = `
    CREATE TABLE IF NOT EXISTS outgoing_series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      payee_contact_id INTEGER NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
      total_checks INTEGER NOT NULL,
      completed_checks INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (payee_contact_id) REFERENCES contacts(id)
    )
  `;

  // טבלת סדרות שקים נכנסים (incoming_series)
  const createIncomingSeriesTable = `
    CREATE TABLE IF NOT EXISTS incoming_series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      payer_contact_id INTEGER NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
      total_checks INTEGER NOT NULL,
      completed_checks INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (payer_contact_id) REFERENCES contacts(id)
    )
  `;

  // טבלת התראות (notifications)
  const createNotificationsTable = `
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      check_type TEXT NOT NULL CHECK (check_type IN ('outgoing', 'incoming')),
      check_id INTEGER NOT NULL,
      notification_type TEXT NOT NULL CHECK (notification_type IN ('check_due_soon', 'check_bounced', 'check_cleared', 'check_deposited', 'check_expiring', 'insufficient_balance', 'duplicate_deposit')),
      channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
      recipient TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
      sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // טבלת פנקסי שקים (check_books)
  const createCheckBooksTable = `
    CREATE TABLE IF NOT EXISTS check_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_name TEXT NOT NULL,
      start_number INTEGER NOT NULL,
      end_number INTEGER NOT NULL,
      current_number INTEGER NOT NULL,
      total_checks INTEGER NOT NULL,
      used_checks INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // יצירת כל הטבלאות
  const tables = [
    { name: 'business_account', sql: createBusinessAccountTable },
    { name: 'contacts', sql: createContactsTable },
    { name: 'outgoing_checks', sql: createOutgoingChecksTable },
    { name: 'incoming_checks', sql: createIncomingChecksTable },
    { name: 'outgoing_series', sql: createOutgoingSeriesTable },
    { name: 'incoming_series', sql: createIncomingSeriesTable },
    { name: 'notifications', sql: createNotificationsTable },
    { name: 'check_books', sql: createCheckBooksTable }
  ];

  let completedTables = 0;
  
  tables.forEach(table => {
    db.run(table.sql, (err) => {
      if (err) {
        console.error(`Error creating ${table.name} table:`, err.message);
      } else {
        console.log(`${table.name} table created or already exists`);
      }
      
      completedTables++;
      if (completedTables === tables.length) {
        console.log('All tables created successfully');
        // הוספת נתונים לדוגמה אם הטבלות ריקות
        insertSampleData();
      }
    });
  });
}

// הוספת נתונים לדוגמה
function insertSampleData() {
  // בדיקה אם יש נתונים קיימים
  db.get("SELECT COUNT(*) as count FROM business_account", (err, businessRow) => {
    if (err) {
      console.error('Error checking business_account count:', err.message);
      return;
    }

    // הוספת עסק לדוגמה
    if (businessRow.count === 0) {
      db.run(`
        INSERT INTO business_account (name, business_id, bank_name, bank_branch, account_number, phone, email, address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, ['עסק לדוגמה', '123456789', 'בנק הפועלים', '123', '1234567', '03-1234567', 'business@example.com', 'רחוב הרצל 1, תל אביב'], (err) => {
        if (err) {
          console.error('Error inserting business account:', err.message);
        } else {
          console.log('Sample business account inserted successfully');
        }
      });
    }
  });

  // הוספת אנשי קשר לדוגמה
  db.get("SELECT COUNT(*) as count FROM contacts", (err, row) => {
    if (err) {
      console.error('Error checking contacts count:', err.message);
      return;
    }

    if (row.count === 0) {
      const sampleContacts = [
        ['יוסי כהן', 'supplier', '123456789', '050-1234567', 'yossi@example.com', 'בנק הפועלים', '123', '1111111', 'PROXY123', 1, 0],
        ['שרה לוי', 'customer', '987654321', '052-9876543', 'sara@example.com', 'בנק לאומי', '456', '2222222', 'PROXY456', 1, 0],
        ['דוד ישראלי', 'both', '555555555', '053-5555555', 'david@example.com', 'בנק דיסקונט', '789', '3333333', 'PROXY789', 1, 1],
        ['רחל גולדברג', 'supplier', '111111111', '054-1111111', 'rachel@example.com', 'בנק מזרחי', '012', '4444444', 'PROXY012', 1, 0],
        ['משה אברהם', 'customer', '222222222', '055-2222222', 'moshe@example.com', 'בנק איגוד', '345', '5555555', 'PROXY345', 1, 1]
      ];

      const insertStatement = db.prepare(`
        INSERT INTO contacts (name, type, id_number, phone, email, bank_name, bank_branch, account_number, proxy, is_active, is_business) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

  // הוספת פנקס שקים לדוגמה
  db.get("SELECT COUNT(*) as count FROM check_books", (err, row) => {
    if (err) {
      console.error('Error checking check_books count:', err.message);
      return;
    }

    if (row.count === 0) {
      db.run(`
        INSERT INTO check_books (book_name, start_number, end_number, current_number, total_checks, used_checks, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, ['פנקס שקים 1', 1000, 1999, 1000, 1000, 0, 'active'], (err) => {
        if (err) {
          console.error('Error inserting check book:', err.message);
        } else {
          console.log('Sample check book inserted successfully');
        }
      });
    }
  });

  // הוספת שקים לדוגמה (אחרי שהוספנו אנשי קשר)
  setTimeout(() => {
    db.get("SELECT COUNT(*) as count FROM outgoing_checks", (err, row) => {
      if (err) {
        console.error('Error checking outgoing_checks count:', err.message);
        return;
      }

      if (row.count === 0) {
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const sampleOutgoingChecks = [
          ['1001', 1, 5000.00, 'ILS', today, nextWeek, 'pending', 0, null, null, 0, null, null, 'שק לדוגמה 1'],
          ['1002', 2, 3000.00, 'ILS', today, nextMonth, 'pending', 0, null, null, 0, null, null, 'שק לדוגמה 2'],
          ['1003', 3, 7500.00, 'ILS', today, nextWeek, 'cleared', 0, null, null, 0, null, null, 'שק לדוגמה 3']
        ];

        const insertOutgoingStatement = db.prepare(`
          INSERT INTO outgoing_checks (check_number, payee_contact_id, amount, currency, issue_date, due_date, status, is_series, series_id, series_number, is_physical, image_url, cancellation_reason, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        sampleOutgoingChecks.forEach(check => {
          insertOutgoingStatement.run(check, (err) => {
            if (err) {
              console.error('Error inserting sample outgoing check:', err.message);
            }
          });
        });

        insertOutgoingStatement.finalize((err) => {
          if (err) {
            console.error('Error finalizing outgoing checks insert statement:', err.message);
          } else {
            console.log('Sample outgoing checks inserted successfully');
          }
        });
      } else {
        console.log('Outgoing checks already exist, skipping sample data');
      }
    });

    db.get("SELECT COUNT(*) as count FROM incoming_checks", (err, row) => {
      if (err) {
        console.error('Error checking incoming_checks count:', err.message);
        return;
      }

      if (row.count === 0) {
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const sampleIncomingChecks = [
          ['2001', 2, 4000.00, 'ILS', today, nextWeek, 'waiting_deposit', null, null, null, 0, null, null, 0, null, 'שק נכנס לדוגמה 1'],
          ['2002', 3, 6000.00, 'ILS', today, nextMonth, 'deposited', today, null, null, 0, null, null, 0, null, 'שק נכנס לדוגמה 2'],
          ['2003', 4, 2500.00, 'ILS', today, nextWeek, 'cleared', today, null, today, 0, null, null, 0, null, 'שק נכנס לדוגמה 3']
        ];

        const insertIncomingStatement = db.prepare(`
          INSERT INTO incoming_checks (check_number, payer_contact_id, amount, currency, issue_date, due_date, status, deposited_at, deposit_scheduled_date, cleared_at, is_series, series_id, series_number, is_physical, image_url, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        sampleIncomingChecks.forEach(check => {
          insertIncomingStatement.run(check, (err) => {
            if (err) {
              console.error('Error inserting sample incoming check:', err.message);
            }
          });
        });

        insertIncomingStatement.finalize((err) => {
          if (err) {
            console.error('Error finalizing incoming checks insert statement:', err.message);
          } else {
            console.log('Sample incoming checks inserted successfully');
          }
        });
      } else {
        console.log('Incoming checks already exist, skipping sample data');
      }
    });
  }, 1000); // המתנה קצרה כדי לוודא שאנשי הקשר נוספו קודם
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
