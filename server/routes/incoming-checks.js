const express = require('express');
const router = express.Router();
const { db } = require('../database');

// GET /api/incoming-checks - קבלת כל השקים הנכנסים
router.get('/', (req, res) => {
  const { status, payer_id, start_date, end_date, min_amount, max_amount, check_number, sort } = req.query;
  
  let query = `
    SELECT 
      ic.*,
      c.name as payer_name,
      c.phone as payer_phone,
      c.email as payer_email,
      c.bank_name,
      c.bank_branch,
      c.account_number
    FROM incoming_checks ic
    LEFT JOIN contacts c ON ic.payer_contact_id = c.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (status) {
    query += ' AND ic.status = ?';
    params.push(status);
  }
  
  if (payer_id) {
    query += ' AND ic.payer_contact_id = ?';
    params.push(payer_id);
  }
  
  if (start_date) {
    query += ' AND ic.due_date >= ?';
    params.push(start_date);
  }
  
  if (end_date) {
    query += ' AND ic.due_date <= ?';
    params.push(end_date);
  }
  
  if (min_amount) {
    query += ' AND ic.amount >= ?';
    params.push(min_amount);
  }
  
  if (max_amount) {
    query += ' AND ic.amount <= ?';
    params.push(max_amount);
  }
  
  if (check_number) {
    query += ' AND ic.check_number LIKE ?';
    params.push(`%${check_number}%`);
  }
  
  if (sort) {
    switch (sort) {
      case 'due_date':
        query += ' ORDER BY ic.due_date ASC';
        break;
      case 'amount':
        query += ' ORDER BY ic.amount DESC';
        break;
      case 'created_at':
        query += ' ORDER BY ic.created_at DESC';
        break;
      default:
        query += ' ORDER BY ic.created_at DESC';
    }
  } else {
    query += ' ORDER BY ic.created_at DESC';
  }
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching incoming checks:', err);
      return res.status(500).json({ error: 'שגיאה בטעינת השקים הנכנסים' });
    }
    
    res.json(rows);
  });
});

// GET /api/incoming-checks/:id - שק נכנס ספציפי
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      ic.*,
      c.name as payer_name,
      c.phone as payer_phone,
      c.email as payer_email,
      c.bank_name,
      c.bank_branch,
      c.account_number,
      c.proxy
    FROM incoming_checks ic
    LEFT JOIN contacts c ON ic.payer_contact_id = c.id
    WHERE ic.id = ?
  `;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Error fetching incoming check:', err);
      return res.status(500).json({ error: 'שגיאה בטעינת השק' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'שק לא נמצא' });
    }
    
    res.json(row);
  });
});

// POST /api/incoming-checks - יצירת שק נכנס בודד
router.post('/', (req, res) => {
  const { check_number, payer_contact_id, amount, issue_date, due_date, is_physical, notes } = req.body;
  
  // ולידציות
  if (!check_number || !payer_contact_id || !amount || !issue_date || !due_date) {
    return res.status(400).json({ error: 'כל השדות החובה נדרשים' });
  }
  
  // בדיקה שמספר השק מכיל רק מספרים
  if (!/^[0-9]+$/.test(check_number)) {
    return res.status(400).json({ error: 'מספר השק חייב להכיל רק ספרות' });
  }
  
  if (amount <= 0) {
    return res.status(400).json({ error: 'הסכום חייב להיות גדול מ-0' });
  }
  
  if (new Date(due_date) < new Date(issue_date)) {
    return res.status(400).json({ error: 'תאריך הפירעון חייב להיות אחרי תאריך ההנפקה' });
  }
  
  // בדיקה שמספר השק ייחודי
  db.get('SELECT id FROM incoming_checks WHERE check_number = ?', [check_number], (err, row) => {
    if (err) {
      console.error('Error checking check number uniqueness:', err);
      return res.status(500).json({ error: 'שגיאה בבדיקת מספר השק' });
    }
    
    if (row) {
      return res.status(400).json({ error: 'מספר השק כבר קיים במערכת' });
    }
    
    // יצירת השק
    const query = `
      INSERT INTO incoming_checks 
      (check_number, payer_contact_id, amount, currency, issue_date, due_date, is_physical, notes)
      VALUES (?, ?, ?, 'ILS', ?, ?, ?, ?)
    `;
    
    db.run(query, [check_number, payer_contact_id, amount, issue_date, due_date, is_physical || 0, notes], function(err) {
      if (err) {
        console.error('Error creating incoming check:', err);
        return res.status(500).json({ error: 'שגיאה ביצירת השק' });
      }
      
      res.status(201).json({ 
        id: this.lastID,
        message: 'שק נכנס נוצר בהצלחה',
        check_number,
        amount
      });
    });
  });
});

// POST /api/incoming-checks/series - יצירת סדרת שקים נכנסים
router.post('/series', (req, res) => {
  const { payer_contact_id, amount, day_of_month, total_checks, start_month } = req.body;
  
  // ולידציות
  if (!payer_contact_id || !amount || !day_of_month || !total_checks || !start_month) {
    return res.status(400).json({ error: 'כל השדות החובה נדרשים' });
  }
  
  if (total_checks < 2 || total_checks > 24) {
    return res.status(400).json({ error: 'מספר השקים חייב להיות בין 2-24' });
  }
  
  if (day_of_month < 1 || day_of_month > 31) {
    return res.status(400).json({ error: 'יום בחודש חייב להיות בין 1-31' });
  }
  
  if (amount <= 0) {
    return res.status(400).json({ error: 'הסכום חייב להיות גדול מ-0' });
  }
  
  // יצירת הסדרה
  const seriesQuery = `
    INSERT INTO incoming_series 
    (payer_contact_id, amount, day_of_month, total_checks)
    VALUES (?, ?, ?, ?)
  `;
  
  db.run(seriesQuery, [payer_contact_id, amount, day_of_month, total_checks], function(err) {
    if (err) {
      console.error('Error creating incoming series:', err);
      return res.status(500).json({ error: 'שגיאה ביצירת סדרת השקים' });
    }
    
    const seriesId = this.lastID;
    
    // יצירת כל השקים בסדרה
    for (let i = 0; i < total_checks; i++) {
      const checkDate = new Date(start_month);
      checkDate.setMonth(checkDate.getMonth() + i);
      
      // טיפול בחודשים קצרים
      const daysInMonth = new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, 0).getDate();
      const actualDay = Math.min(day_of_month, daysInMonth);
      checkDate.setDate(actualDay);
      
      const issueDate = new Date();
      const dueDate = checkDate.toISOString().split('T')[0];
      
      // יצירת מספר שק ייחודי
      const checkNumber = `INC${Date.now()}${i}`;
      
      const checkQuery = `
        INSERT INTO incoming_checks 
        (check_number, payer_contact_id, amount, currency, issue_date, due_date, is_series, series_id, series_number, notes)
        VALUES (?, ?, ?, 'ILS', ?, ?, 1, ?, ?, ?)
      `;
      
      db.run(checkQuery, [checkNumber, payer_contact_id, amount, issueDate.toISOString().split('T')[0], dueDate, seriesId, i + 1, `שק ${i + 1} מתוך ${total_checks}`], (err) => {
        if (err) {
          console.error('Error creating check in series:', err);
        }
      });
    }
    
    res.status(201).json({ 
      series_id: seriesId,
      message: `סדרת שקים נכנסים נוצרה בהצלחה - ${total_checks} שקים`,
      total_checks,
      amount
    });
  });
});

// PUT /api/incoming-checks/:id/deposit - הפקדת שק
router.put('/:id/deposit', (req, res) => {
  const { id } = req.params;
  
  // בדיקת השק
  db.get('SELECT * FROM incoming_checks WHERE id = ?', [id], (err, check) => {
    if (err) {
      console.error('Error fetching check for deposit:', err);
      return res.status(500).json({ error: 'שגיאה בטעינת השק' });
    }
    
    if (!check) {
      return res.status(404).json({ error: 'שק לא נמצא' });
    }
    
    // בדיקת סטטוס
    if (check.status !== 'waiting_deposit') {
      return res.status(400).json({ error: 'ניתן להפקיד רק שקים במצב "ממתין להפקדה"' });
    }
    
    // בדיקת תאריכים
    const today = new Date();
    const dueDate = new Date(check.due_date);
    const sixMonthsFromDue = new Date(dueDate);
    sixMonthsFromDue.setMonth(sixMonthsFromDue.getMonth() + 6);
    
    if (today < dueDate) {
      return res.status(400).json({ error: 'לא ניתן להפקיד לפני תאריך הפירעון' });
    }
    
    if (today > sixMonthsFromDue) {
      return res.status(400).json({ error: 'השק פג תוקף (עברו 6 חודשים מתאריך הפירעון)' });
    }
    
    // בדיקת כפילות
    if (check.deposited_at) {
      return res.status(400).json({ error: 'שק זה כבר הופקד' });
    }
    
    // עדכון השק
    const query = `
      UPDATE incoming_checks 
      SET status = 'deposited', deposited_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    db.run(query, [id], function(err) {
      if (err) {
        console.error('Error depositing check:', err);
        return res.status(500).json({ error: 'שגיאה בהפקדת השק' });
      }
      
      // שליחת SMS מוקאפ
      console.log(`SMS מוקאפ: שק נכנס ${check.check_number} בסך ${check.amount} ₪ הופקד בהצלחה`);
      
      res.json({ message: 'השק הופקד בהצלחה' });
    });
  });
});

// PUT /api/incoming-checks/:id/schedule-deposit - תזמון הפקדה
router.put('/:id/schedule-deposit', (req, res) => {
  const { id } = req.params;
  const { deposit_date } = req.body;
  
  if (!deposit_date) {
    return res.status(400).json({ error: 'תאריך הפקדה נדרש' });
  }
  
  const query = `
    UPDATE incoming_checks 
    SET deposit_scheduled_date = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status = 'waiting_deposit'
  `;
  
  db.run(query, [deposit_date, id], function(err) {
    if (err) {
      console.error('Error scheduling deposit:', err);
      return res.status(500).json({ error: 'שגיאה בתזמון ההפקדה' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'שק לא נמצא או לא ניתן לתזמן הפקדה' });
    }
    
    res.json({ message: 'הפקדה מתוזמנת בהצלחה' });
  });
});

// POST /api/incoming-checks/:id/invoice - הוצאת חשבונית
router.post('/:id/invoice', (req, res) => {
  const { id } = req.params;
  const { invoice_number } = req.body;
  
  if (!invoice_number) {
    return res.status(400).json({ error: 'מספר חשבונית נדרש' });
  }
  
  // בדיקת השק
  db.get('SELECT * FROM incoming_checks WHERE id = ? AND status != "cancelled"', [id], (err, check) => {
    if (err) {
      console.error('Error fetching check for invoice:', err);
      return res.status(500).json({ error: 'שגיאה בטעינת השק' });
    }
    
    if (!check) {
      return res.status(404).json({ error: 'שק לא נמצא או בוטל' });
    }
    
    const query = `
      UPDATE incoming_checks 
      SET invoice_number = ?, invoice_issued_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    db.run(query, [invoice_number, id], function(err) {
      if (err) {
        console.error('Error issuing invoice:', err);
        return res.status(500).json({ error: 'שגיאה בהוצאת החשבונית' });
      }
      
      res.json({ 
        message: 'חשבונית הונפקה בהצלחה',
        invoice_number,
        issued_at: new Date().toISOString()
      });
    });
  });
});

// PUT /api/incoming-checks/:id/status - עדכון סטטוס
router.put('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, cancellation_reason } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: 'סטטוס נדרש' });
  }
  
  const validStatuses = ['waiting_deposit', 'deposited', 'cleared', 'bounced', 'endorsed', 'expired', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'סטטוס לא תקין' });
  }
  
  if (status === 'cancelled' && !cancellation_reason) {
    return res.status(400).json({ error: 'סיבת ביטול נדרשת' });
  }
  
  const query = `
    UPDATE incoming_checks 
    SET status = ?, cancellation_reason = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  
  db.run(query, [status, cancellation_reason, id], function(err) {
    if (err) {
      console.error('Error updating check status:', err);
      return res.status(500).json({ error: 'שגיאה בעדכון סטטוס השק' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'שק לא נמצא' });
    }
    
    // שליחת התראה מוקאפ
    if (status === 'bounced') {
      console.log(`SMS מוקאפ: שק נכנס ${id} חזר`);
    } else if (status === 'cleared') {
      console.log(`SMS מוקאפ: שק נכנס ${id} נפרע בהצלחה`);
    }
    
    res.json({ message: 'סטטוס השק עודכן בהצלחה' });
  });
});

// POST /api/incoming-checks/physical - הוספת שיק פיזי
router.post('/physical', (req, res) => {
  const { 
    check_number, 
    payer_name, 
    amount, 
    due_date, 
    bank_name, 
    bank_branch, 
    notes 
  } = req.body;
  
  // ולידציות
  if (!check_number || !payer_name || !amount || !due_date) {
    return res.status(400).json({ error: 'כל השדות החובה נדרשים' });
  }
  
  // בדיקה שמספר השק מכיל רק מספרים
  if (!/^[0-9]+$/.test(check_number)) {
    return res.status(400).json({ error: 'מספר השק חייב להכיל רק ספרות' });
  }
  
  if (amount <= 0) {
    return res.status(400).json({ error: 'הסכום חייב להיות גדול מ-0' });
  }
  
  // בדיקה שמספר השק ייחודי
  db.get('SELECT id FROM incoming_checks WHERE check_number = ?', [check_number], (err, row) => {
    if (err) {
      console.error('Error checking check number uniqueness:', err);
      return res.status(500).json({ error: 'שגיאה בבדיקת מספר השק' });
    }
    
    if (row) {
      return res.status(400).json({ error: 'מספר השק כבר קיים במערכת' });
    }
    
    // יצירת השק הפיזי - ללא קשר ל-contact
    const query = `
      INSERT INTO incoming_checks 
      (check_number, payer_contact_id, payer_name, amount, currency, issue_date, due_date, is_physical, bank_name, bank_branch, notes, status)
      VALUES (?, NULL, ?, ?, 'ILS', CURRENT_DATE, ?, 1, ?, ?, ?, 'waiting_deposit')
    `;
    
    db.run(query, [check_number, payer_name, amount, due_date, bank_name, bank_branch, notes], function(err) {
      if (err) {
        console.error('Error creating physical incoming check:', err);
        return res.status(500).json({ error: 'שגיאה ביצירת השק הפיזי' });
      }
      
      res.status(201).json({ 
        id: this.lastID,
        message: 'שק פיזי נוסף בהצלחה',
        check_number,
        amount,
        is_physical: true
      });
    });
  });
});

// GET /api/incoming-checks/stats - סטטיסטיקות
router.get('/stats', (req, res) => {
  const queries = {
    waiting_deposit_amount: 'SELECT COALESCE(SUM(amount), 0) as amount FROM incoming_checks WHERE status = "waiting_deposit"',
    waiting_deposit_count: 'SELECT COUNT(*) as count FROM incoming_checks WHERE status = "waiting_deposit"',
    deposited_count: 'SELECT COUNT(*) as count FROM incoming_checks WHERE status = "deposited"',
    cleared_count: 'SELECT COUNT(*) as count FROM incoming_checks WHERE status = "cleared"',
    bounced_count: 'SELECT COUNT(*) as count FROM incoming_checks WHERE status = "bounced"'
  };
  
  const stats = {};
  let completedQueries = 0;
  
  Object.keys(queries).forEach(key => {
    db.get(queries[key], (err, row) => {
      if (err) {
        console.error(`Error fetching ${key}:`, err);
        stats[key] = 0;
      } else {
        stats[key] = row.count || row.amount || 0;
      }
      
      completedQueries++;
      if (completedQueries === Object.keys(queries).length) {
        res.json(stats);
      }
    });
  });
});

module.exports = router;
