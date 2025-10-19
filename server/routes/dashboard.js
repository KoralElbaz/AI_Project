const express = require('express');
const router = express.Router();
const { db } = require('../database');

// GET /api/dashboard/stats - כל הסטטיסטיקות לדשבורד
router.get('/stats', (req, res) => {
  const outgoingQueries = {
    total_amount: 'SELECT COALESCE(SUM(amount), 0) as amount FROM outgoing_checks WHERE status = "pending"',
    pending_count: 'SELECT COUNT(*) as count FROM outgoing_checks WHERE status = "pending"',
    due_this_week: `SELECT COUNT(*) as count FROM outgoing_checks 
                     WHERE status = "pending" 
                     AND due_date BETWEEN date('now') AND date('now', '+7 days')`,
    due_this_month: `SELECT COUNT(*) as count FROM outgoing_checks 
                      WHERE status = "pending" 
                      AND due_date BETWEEN date('now') AND date('now', '+30 days')`,
    bounced_count: 'SELECT COUNT(*) as count FROM outgoing_checks WHERE status = "bounced"'
  };

  const incomingQueries = {
    waiting_deposit_amount: 'SELECT COALESCE(SUM(amount), 0) as amount FROM incoming_checks WHERE status = "waiting_deposit"',
    waiting_deposit_count: 'SELECT COUNT(*) as count FROM incoming_checks WHERE status = "waiting_deposit"',
    deposited_count: 'SELECT COUNT(*) as count FROM incoming_checks WHERE status = "deposited"',
    cleared_count: 'SELECT COUNT(*) as count FROM incoming_checks WHERE status = "cleared"',
    bounced_count: 'SELECT COUNT(*) as count FROM incoming_checks WHERE status = "bounced"'
  };

  const stats = {
    outgoing: {},
    incoming: {}
  };

  let completedQueries = 0;
  const totalQueries = Object.keys(outgoingQueries).length + Object.keys(incomingQueries).length;

  // ביצוע שאילתות לשקים יוצאים
  Object.keys(outgoingQueries).forEach(key => {
    db.get(outgoingQueries[key], (err, row) => {
      if (err) {
        console.error(`Error fetching outgoing ${key}:`, err);
        stats.outgoing[key] = 0;
      } else {
        stats.outgoing[key] = row.count || row.amount || 0;
      }
      
      completedQueries++;
      if (completedQueries === totalQueries) {
        res.json(stats);
      }
    });
  });

  // ביצוע שאילתות לשקים נכנסים
  Object.keys(incomingQueries).forEach(key => {
    db.get(incomingQueries[key], (err, row) => {
      if (err) {
        console.error(`Error fetching incoming ${key}:`, err);
        stats.incoming[key] = 0;
      } else {
        stats.incoming[key] = row.count || row.amount || 0;
      }
      
      completedQueries++;
      if (completedQueries === totalQueries) {
        res.json(stats);
      }
    });
  });
});

// GET /api/dashboard/recent-checks - שקים אחרונים
router.get('/recent-checks', (req, res) => {
  const { limit = 10 } = req.query;
  
  const query = `
    SELECT 
      'outgoing' as type,
      check_number,
      amount,
      due_date,
      status,
      c.name as contact_name,
      created_at
    FROM outgoing_checks oc
    LEFT JOIN contacts c ON oc.payee_contact_id = c.id
    
    UNION ALL
    
    SELECT 
      'incoming' as type,
      check_number,
      amount,
      due_date,
      status,
      c.name as contact_name,
      created_at
    FROM incoming_checks ic
    LEFT JOIN contacts c ON ic.payer_contact_id = c.id
    
    ORDER BY created_at DESC
    LIMIT ?
  `;
  
  db.all(query, [limit], (err, rows) => {
    if (err) {
      console.error('Error fetching recent checks:', err);
      return res.status(500).json({ error: 'שגיאה בטעינת השקים האחרונים' });
    }
    
    res.json(rows);
  });
});

// GET /api/dashboard/upcoming-due - שקים שמגיעים לפירעון בקרוב
router.get('/upcoming-due', (req, res) => {
  const { days = 7 } = req.query;
  
  const query = `
    SELECT 
      'outgoing' as type,
      check_number,
      amount,
      due_date,
      status,
      c.name as contact_name,
      c.phone as contact_phone
    FROM outgoing_checks oc
    LEFT JOIN contacts c ON oc.payee_contact_id = c.id
    WHERE oc.status = 'pending' 
    AND oc.due_date BETWEEN date('now') AND date('now', '+${days} days')
    
    UNION ALL
    
    SELECT 
      'incoming' as type,
      check_number,
      amount,
      due_date,
      status,
      c.name as contact_name,
      c.phone as contact_phone
    FROM incoming_checks ic
    LEFT JOIN contacts c ON ic.payer_contact_id = c.id
    WHERE ic.status IN ('waiting_deposit', 'deposited')
    AND ic.due_date BETWEEN date('now') AND date('now', '+${days} days')
    
    ORDER BY due_date ASC
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error fetching upcoming due checks:', err);
      return res.status(500).json({ error: 'שגיאה בטעינת השקים המגיעים לפירעון' });
    }
    
    res.json(rows);
  });
});

module.exports = router;
