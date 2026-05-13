const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('./database/database.cjs');

const router = express.Router();
const db = database.getDB();

// Initialize notifications table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    medication_id INTEGER,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'medication_due',
    is_read BOOLEAN DEFAULT 0,
    is_dismissed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (medication_id) REFERENCES medications(id)
  )
`);

// Get medications for a patient
router.get('/patient/:patientId', (req, res) => {
  const { patientId } = req.params;
  
  db.all('SELECT * FROM medications WHERE patient_id = ?', [patientId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Add medication
router.post('/', [
  body('patientId').isInt().withMessage('Valid patient ID is required'),
  body('name').notEmpty().withMessage('Medication name is required'),
  body('dosage').notEmpty().withMessage('Dosage is required'),
  body('frequency').notEmpty().withMessage('Frequency is required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { patientId, name, dosage, frequency, lastTaken } = req.body;
  
  const query = `
    INSERT INTO medications (patient_id, name, dosage, frequency, last_taken)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  db.run(query, [patientId, name, dosage, frequency, lastTaken], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.status(201).json({
      id: this.lastID,
      patientId,
      name,
      dosage,
      frequency,
      lastTaken
    });
  });
});

// Update medication
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { lastTaken } = req.body;
  
  const query = 'UPDATE medications SET last_taken = ? WHERE id = ?';
  
  db.run(query, [lastTaken, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Medication not found' });
    }
    
    res.json({ message: 'Medication updated successfully' });
  });
});

// Delete medication
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM medications WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Medication not found' });
    }
    
    res.json({ message: 'Medication deleted successfully' });
  });
});

// Get notifications for a patient
router.get('/notifications/:patientId', (req, res) => {
  const { patientId } = req.params;
  const { unread_only } = req.query;

  let query = 'SELECT * FROM notifications WHERE patient_id = ?';
  let params = [patientId];

  if (unread_only === 'true') {
    query += ' AND is_read = 0';
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Mark notification as read
router.put('/notifications/:id/read', (req, res) => {
  const { id } = req.params;

  db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  });
});

// Dismiss notification
router.put('/notifications/:id/dismiss', (req, res) => {
  const { id } = req.params;

  db.run('UPDATE notifications SET is_dismissed = 1 WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification dismissed' });
  });
});

// Check for due medications and create notifications
router.post('/check-due/:patientId', (req, res) => {
  const { patientId } = req.params;

  // Get all medications for the patient
  db.all('SELECT * FROM medications WHERE patient_id = ?', [patientId], (err, medications) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const now = new Date();
    const dueMedications = [];

    medications.forEach(med => {
      if (isMedicationDue(med, now)) {
        dueMedications.push(med);

        // Check if notification already exists for today
        const today = now.toISOString().split('T')[0];
        db.get(
          'SELECT id FROM notifications WHERE medication_id = ? AND DATE(created_at) = ? AND type = "medication_due"',
          [med.id, today],
          (err, existingNotification) => {
            if (err) {
              console.error('Error checking existing notification:', err);
              return;
            }

            if (!existingNotification) {
              // Create new notification
              const message = `${med.name} (${med.dosage}) is due now!`;
              db.run(
                'INSERT INTO notifications (patient_id, medication_id, message, type) VALUES (?, ?, ?, ?)',
                [patientId, med.id, message, 'medication_due'],
                function(err) {
                  if (err) {
                    console.error('Error creating notification:', err);
                  }
                }
              );
            }
          }
        );
      }
    });

    res.json({
      dueMedications,
      count: dueMedications.length,
      message: `Found ${dueMedications.length} due medications`
    });
  });
});

// Helper function to check if medication is due
function isMedicationDue(medication, currentTime = new Date()) {
  if (!medication.last_taken) return true;

  const lastTaken = new Date(medication.last_taken);
  const hoursSinceLastTaken = (currentTime - lastTaken) / (1000 * 60 * 60);

  const frequency = medication.frequency.toLowerCase();

  if (frequency.includes('daily') || frequency.includes('once')) {
    return hoursSinceLastTaken >= 24;
  } else if (frequency.includes('twice') || frequency.includes('2')) {
    return hoursSinceLastTaken >= 12;
  } else if (frequency.includes('three') || frequency.includes('3')) {
    return hoursSinceLastTaken >= 8;
  } else if (frequency.includes('four') || frequency.includes('4')) {
    return hoursSinceLastTaken >= 6;
  }

  // Default to 8 hours for unknown frequencies
  return hoursSinceLastTaken >= 8;
}

module.exports = router;