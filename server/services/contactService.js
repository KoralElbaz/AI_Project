const { db } = require('../database');

class ContactService {
  
  // קבלת כל אנשי הקשר
  static getAllContacts() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT id, name, type, id_number, phone, email, bank_name, bank_branch, account_number, proxy, is_active, is_business, created_at, updated_at 
        FROM contacts 
        ORDER BY name ASC
      `;
      
      db.all(query, [], (err, rows) => {
        if (err) {
          console.error('Error fetching contacts:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // קבלת איש קשר לפי ID
  static getContactById(id) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT id, name, type, id_number, phone, email, bank_name, bank_branch, account_number, proxy, is_active, is_business, created_at, updated_at 
        FROM contacts 
        WHERE id = ?
      `;
      
      db.get(query, [id], (err, row) => {
        if (err) {
          console.error('Error fetching contact by ID:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // יצירת איש קשר חדש
  static createContact(contactData) {
    return new Promise((resolve, reject) => {
      const { name, type, id_number, phone, email, bank_name, bank_branch, account_number, proxy, is_business } = contactData;
      
      // בדיקת תקינות נתונים
      if (!name || !phone) {
        reject(new Error('Name and phone are required'));
        return;
      }

      const query = `
        INSERT INTO contacts (name, type, id_number, phone, email, bank_name, bank_branch, account_number, proxy, is_business) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      db.run(query, [name, type || 'customer', id_number || null, phone, email || null, bank_name || null, bank_branch || null, account_number || null, proxy || null, is_business || 0], function(err) {
        if (err) {
          console.error('Error creating contact:', err.message);
          reject(err);
        } else {
          // החזרת הנתונים החדשים
          ContactService.getContactById(this.lastID)
            .then(newContact => resolve(newContact))
            .catch(reject);
        }
      });
    });
  }

  // עדכון איש קשר
  static updateContact(id, contactData) {
    return new Promise((resolve, reject) => {
      const { name, type, id_number, phone, email, bank_name, bank_branch, account_number, proxy, is_business } = contactData;
      
      // בדיקת תקינות נתונים
      if (!name || !phone) {
        reject(new Error('Name and phone are required'));
        return;
      }

      const query = `
        UPDATE contacts 
        SET name = ?, type = ?, id_number = ?, phone = ?, email = ?, bank_name = ?, bank_branch = ?, account_number = ?, proxy = ?, is_business = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      
      db.run(query, [name, type || 'customer', id_number || null, phone, email || null, bank_name || null, bank_branch || null, account_number || null, proxy || null, is_business || 0, id], function(err) {
        if (err) {
          console.error('Error updating contact:', err.message);
          reject(err);
        } else if (this.changes === 0) {
          reject(new Error('Contact not found'));
        } else {
          // החזרת הנתונים המעודכנים
          ContactService.getContactById(id)
            .then(updatedContact => resolve(updatedContact))
            .catch(reject);
        }
      });
    });
  }

  // מחיקת איש קשר
  static deleteContact(id) {
    return new Promise((resolve, reject) => {
      const query = 'DELETE FROM contacts WHERE id = ?';
      
      db.run(query, [id], function(err) {
        if (err) {
          console.error('Error deleting contact:', err.message);
          reject(err);
        } else if (this.changes === 0) {
          reject(new Error('Contact not found'));
        } else {
          resolve({ message: 'Contact deleted successfully', id: id });
        }
      });
    });
  }

  // חיפוש אנשי קשר לפי שם או טלפון
  static searchContacts(searchTerm) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT id, name, type, id_number, phone, email, bank_name, bank_branch, account_number, proxy, is_active, is_business, created_at, updated_at 
        FROM contacts 
        WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?
        ORDER BY name ASC
      `;
      
      const searchPattern = `%${searchTerm}%`;
      
      db.all(query, [searchPattern, searchPattern, searchPattern], (err, rows) => {
        if (err) {
          console.error('Error searching contacts:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // ספירת אנשי קשר
  static getContactsCount() {
    return new Promise((resolve, reject) => {
      const query = 'SELECT COUNT(*) as count FROM contacts';
      
      db.get(query, [], (err, row) => {
        if (err) {
          console.error('Error getting contacts count:', err.message);
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }
}

module.exports = ContactService;
