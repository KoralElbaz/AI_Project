const express = require('express');
const router = express.Router();
const { db } = require('../database');

// GET /api/outgoing-checks - קבלת כל השקים היוצאים
router.get('/', (req, res) => {
  const { status, payee_id, start_date, end_date, min_amount, max_amount, check_number, sort } = req.query;
  
  let query = `
    SELECT 
      oc.*,
      c.name as payee_name,
      c.phone as payee_phone,
      c.email as payee_email,
      c.bank_name,
      c.bank_branch,
      c.account_number
    FROM outgoing_checks oc
    LEFT JOIN contacts c ON oc.payee_contact_id = c.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (status) {
    query += ' AND oc.status = ?';
    params.push(status);
  }
  
  if (payee_id) {
    query += ' AND oc.payee_contact_id = ?';
    params.push(payee_id);
  }
  
  if (start_date) {
    query += ' AND oc.due_date >= ?';
    params.push(start_date);
  }
  
  if (end_date) {
    query += ' AND oc.due_date <= ?';
    params.push(end_date);
  }
  
  if (min_amount) {
    query += ' AND oc.amount >= ?';
    params.push(min_amount);
  }
  
  if (max_amount) {
    query += ' AND oc.amount <= ?';
    params.push(max_amount);
  }
  
  if (check_number) {
    query += ' AND oc.check_number LIKE ?';
    params.push(`%${check_number}%`);
  }
  
  if (sort) {
    switch (sort) {
      case 'due_date':
        query += ' ORDER BY oc.due_date DESC';
        break;
      case 'amount':
        query += ' ORDER BY oc.amount DESC';
        break;
      case 'created_at':
        query += ' ORDER BY oc.created_at DESC';
        break;
      default:
        query += ' ORDER BY oc.created_at DESC';
    }
  } else {
    query += ' ORDER BY oc.created_at DESC';
  }
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching outgoing checks:', err);
      return res.status(500).json({ error: 'שגיאה בטעינת השקים היוצאים' });
    }
    
    res.json(rows);
  });
});

// GET /api/outgoing-checks/:id - שק יוצא ספציפי
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      oc.*,
      c.name as payee_name,
      c.phone as payee_phone,
      c.email as payee_email,
      c.bank_name,
      c.bank_branch,
      c.account_number,
      c.proxy
    FROM outgoing_checks oc
    LEFT JOIN contacts c ON oc.payee_contact_id = c.id
    WHERE oc.id = ?
  `;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Error fetching outgoing check:', err);
      return res.status(500).json({ error: 'שגיאה בטעינת השק' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'שק לא נמצא' });
    }
    
    res.json(row);
  });
});

// POST /api/outgoing-checks - יצירת שק יוצא בודד
router.post('/', (req, res) => {
  const { check_number, payee_contact_id, amount, issue_date, due_date, is_physical, notes } = req.body;
  
  // ולידציות
  if (!check_number || !payee_contact_id || !amount || !issue_date || !due_date) {
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
  db.get('SELECT id FROM outgoing_checks WHERE check_number = ?', [check_number], (err, row) => {
    if (err) {
      console.error('Error checking check number uniqueness:', err);
      return res.status(500).json({ error: 'שגיאה בבדיקת מספר השק' });
    }
    
    if (row) {
      return res.status(400).json({ error: 'מספר השק כבר קיים במערכת' });
    }
    
    // יצירת השק
    const query = `
      INSERT INTO outgoing_checks 
      (check_number, payee_contact_id, amount, currency, issue_date, due_date, is_physical, notes)
      VALUES (?, ?, ?, 'ILS', ?, ?, ?, ?)
    `;
    
    db.run(query, [check_number, payee_contact_id, amount, issue_date, due_date, is_physical || 0, notes], function(err) {
      if (err) {
        console.error('Error creating outgoing check:', err);
        return res.status(500).json({ error: 'שגיאה ביצירת השק' });
      }
      
      // שליחת SMS מוקאפ
      console.log(`SMS מוקאפ: שק יוצא מספר ${check_number} בסך ${amount} ₪ נוצר בהצלחה`);
      
      res.status(201).json({ 
        id: this.lastID,
        message: 'שק יוצא נוצר בהצלחה',
        check_number,
        amount
      });
    });
  });
});

// POST /api/outgoing-checks/series - יצירת סדרת שקים
router.post('/series', (req, res) => {
  const { payee_contact_id, amount, day_of_month, total_checks, start_month, check_book_id } = req.body;
  
  // ולידציות
  if (!payee_contact_id || !amount || !day_of_month || !total_checks || !start_month) {
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
    INSERT INTO outgoing_series 
    (payee_contact_id, amount, day_of_month, total_checks)
    VALUES (?, ?, ?, ?)
  `;
  
  db.run(seriesQuery, [payee_contact_id, amount, day_of_month, total_checks], function(err) {
    if (err) {
      console.error('Error creating outgoing series:', err);
      return res.status(500).json({ error: 'שגיאה ביצירת סדרת השקים' });
    }
    
    const seriesId = this.lastID;
    const createdChecks = [];
    
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
      
      // קבלת מספר שק הבא מהפנקס
      db.get('SELECT current_number FROM check_books WHERE status = "active" ORDER BY id LIMIT 1', (err, book) => {
        if (err || !book) {
          console.error('Error getting next check number:', err);
          return;
        }
        
        const checkNumber = book.current_number + i;
        
        const checkQuery = `
          INSERT INTO outgoing_checks 
          (check_number, payee_contact_id, amount, currency, issue_date, due_date, is_series, series_id, series_number, notes)
          VALUES (?, ?, ?, 'ILS', ?, ?, 1, ?, ?, ?)
        `;
        
        db.run(checkQuery, [checkNumber, payee_contact_id, amount, issueDate.toISOString().split('T')[0], dueDate, seriesId, i + 1, `שק ${i + 1} מתוך ${total_checks}`], (err) => {
          if (err) {
            console.error('Error creating check in series:', err);
          } else {
            createdChecks.push(checkNumber);
          }
        });
      });
    }
    
    // עדכון פנקס השקים
    if (check_book_id) {
      db.run('UPDATE check_books SET current_number = current_number + ?, used_checks = used_checks + ? WHERE id = ?', 
        [total_checks, total_checks, check_book_id]);
    }
    
    // שליחת SMS מוקאפ
    console.log(`SMS מוקאפ: סדרת שקים נוצרה - ${total_checks} שקים בסך ${amount} ₪ כל אחד`);
    
    res.status(201).json({ 
      series_id: seriesId,
      message: `סדרת שקים נוצרה בהצלחה - ${total_checks} שקים`,
      total_checks,
      amount
    });
  });
});

// PUT /api/outgoing-checks/:id/status - עדכון סטטוס
router.put('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, cancellation_reason } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: 'סטטוס נדרש' });
  }
  
  const validStatuses = ['pending', 'cleared', 'bounced', 'cancelled', 'in_collection', 'expired'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'סטטוס לא תקין' });
  }
  
  if (status === 'cancelled' && !cancellation_reason) {
    return res.status(400).json({ error: 'סיבת ביטול נדרשת' });
  }
  
  const query = `
    UPDATE outgoing_checks 
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
      console.log(`SMS מוקאפ: שק יוצא ${id} חזר`);
    } else if (status === 'cleared') {
      console.log(`SMS מוקאפ: שק יוצא ${id} נפרע בהצלחה`);
    }
    
    res.json({ message: 'סטטוס השק עודכן בהצלחה' });
  });
});

// DELETE /api/outgoing-checks/:id - מחיקת שק
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  // בדיקה שהשק קיים
  db.get('SELECT id, check_number, status FROM outgoing_checks WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Error checking check existence:', err);
      return res.status(500).json({ error: 'שגיאה בבדיקת השק' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'שק לא נמצא' });
    }
    
    // בדיקה שהשק במצב ממתין לפירעון
    if (row.status !== 'pending') {
      return res.status(400).json({ error: 'ניתן למחוק רק שקים במצב ממתין לפירעון' });
    }
    
    // מחיקת השק
    db.run('DELETE FROM outgoing_checks WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Error deleting check:', err);
        return res.status(500).json({ error: 'שגיאה במחיקת השק' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'שק לא נמצא' });
      }
      
      console.log(`SMS מוקאפ: שק יוצא ${row.check_number} נמחק בהצלחה`);
      
      res.json({ 
        message: 'השק נמחק בהצלחה',
        check_number: row.check_number
      });
    });
  });
});

// POST /api/outgoing-checks/:id/duplicate - שכפול שק
router.post('/:id/duplicate', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT payee_contact_id, amount, notes
    FROM outgoing_checks 
    WHERE id = ?
  `;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Error fetching check for duplication:', err);
      return res.status(500).json({ error: 'שגיאה בטעינת השק' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'שק לא נמצא' });
    }
    
    res.json({
      payee_contact_id: row.payee_contact_id,
      amount: row.amount,
      notes: row.notes
    });
  });
});

// POST /api/outgoing-checks/physical - הוספת שיק פיזי
router.post('/physical', (req, res) => {
  const { 
    check_number, 
    payee_name, 
    amount, 
    due_date, 
    bank_name, 
    bank_branch, 
    notes 
  } = req.body;
  
  // ולידציות
  if (!check_number || !payee_name || !amount || !due_date) {
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
  db.get('SELECT id FROM outgoing_checks WHERE check_number = ?', [check_number], (err, row) => {
    if (err) {
      console.error('Error checking check number uniqueness:', err);
      return res.status(500).json({ error: 'שגיאה בבדיקת מספר השק' });
    }
    
    if (row) {
      return res.status(400).json({ error: 'מספר השק כבר קיים במערכת' });
    }
    
    // יצירת השק הפיזי - ללא קשר ל-contact
    const query = `
      INSERT INTO outgoing_checks 
      (check_number, payee_contact_id, payee_name, amount, currency, issue_date, due_date, is_physical, bank_name, bank_branch, notes, status)
      VALUES (?, NULL, ?, ?, 'ILS', CURRENT_DATE, ?, 1, ?, ?, ?, 'pending')
    `;
    
    db.run(query, [check_number, payee_name, amount, due_date, bank_name, bank_branch, notes], function(err) {
      if (err) {
        console.error('Error creating physical outgoing check:', err);
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

// GET /api/outgoing-checks/stats - סטטיסטיקות
router.get('/stats', (req, res) => {
  const queries = {
    total_checks: 'SELECT COUNT(*) as count FROM outgoing_checks',
    pending_count: 'SELECT COUNT(*) as count FROM outgoing_checks WHERE status = "pending"',
    pending_amount: 'SELECT COALESCE(SUM(amount), 0) as amount FROM outgoing_checks WHERE status = "pending"',
    bounced_count: 'SELECT COUNT(*) as count FROM outgoing_checks WHERE status = "bounced"',
    due_this_week: `SELECT COUNT(*) as count FROM outgoing_checks 
                     WHERE status = "pending" 
                     AND due_date BETWEEN date('now') AND date('now', '+7 days')`,
    due_this_month: `SELECT COUNT(*) as count FROM outgoing_checks 
                      WHERE status = "pending" 
                      AND due_date BETWEEN date('now') AND date('now', '+30 days')`
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
