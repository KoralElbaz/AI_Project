const express = require('express');
const router = express.Router();
const ContactService = require('../services/contactService');

// GET /api/contacts - קבלת כל אנשי הקשר
router.get('/', async (req, res) => {
  try {
    console.log('Fetching all contacts...');
    const contacts = await ContactService.getAllContacts();
    res.json({
      success: true,
      data: contacts,
      count: contacts.length
    });
  } catch (error) {
    console.error('Error in GET /api/contacts:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching contacts',
      error: error.message
    });
  }
});

// GET /api/contacts/:id - קבלת איש קשר לפי ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching contact with ID: ${id}`);
    
    const contact = await ContactService.getContactById(id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    
    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Error in GET /api/contacts/:id:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching contact',
      error: error.message
    });
  }
});

// POST /api/contacts - יצירת איש קשר חדש
router.post('/', async (req, res) => {
  try {
    console.log('Creating new contact:', req.body);
    
    const contact = await ContactService.createContact(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: contact
    });
  } catch (error) {
    console.error('Error in POST /api/contacts:', error.message);
    
    if (error.message === 'Name and phone are required') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating contact',
      error: error.message
    });
  }
});

// PUT /api/contacts/:id - עדכון איש קשר
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Updating contact with ID: ${id}`, req.body);
    
    const contact = await ContactService.updateContact(id, req.body);
    
    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: contact
    });
  } catch (error) {
    console.error('Error in PUT /api/contacts/:id:', error.message);
    
    if (error.message === 'Name and phone are required') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Contact not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating contact',
      error: error.message
    });
  }
});

// DELETE /api/contacts/:id - מחיקת איש קשר
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Deleting contact with ID: ${id}`);
    
    const result = await ContactService.deleteContact(id);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error in DELETE /api/contacts/:id:', error.message);
    
    if (error.message === 'Contact not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error deleting contact',
      error: error.message
    });
  }
});

// GET /api/contacts/search/:term - חיפוש אנשי קשר
router.get('/search/:term', async (req, res) => {
  try {
    const { term } = req.params;
    console.log(`Searching contacts with term: ${term}`);
    
    const contacts = await ContactService.searchContacts(term);
    
    res.json({
      success: true,
      data: contacts,
      count: contacts.length,
      searchTerm: term
    });
  } catch (error) {
    console.error('Error in GET /api/contacts/search/:term:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error searching contacts',
      error: error.message
    });
  }
});

// GET /api/contacts/stats/count - ספירת אנשי קשר
router.get('/stats/count', async (req, res) => {
  try {
    console.log('Getting contacts count...');
    const count = await ContactService.getContactsCount();
    
    res.json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('Error in GET /api/contacts/stats/count:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error getting contacts count',
      error: error.message
    });
  }
});

module.exports = router;
