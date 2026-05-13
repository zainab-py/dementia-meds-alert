// database/database.cjs - Simple SQLite database setup for medication tracking

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    const dbPath = path.join(__dirname, 'medications.db');
    
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      } else {
        console.log('📁 Connected to SQLite database');
        // Add a small delay to ensure database is ready
        setTimeout(() => {
          this.createTables();
        }, 100);
      }
    });
  }

  createTables() {
    // Create patients table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create medications table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS medications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        frequency TEXT NOT NULL,
        last_taken DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);

    // Create notifications table
    this.db.run(`
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

    // Create alert_schedules table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS alert_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medication_id INTEGER,
        patient_id INTEGER,
        alert_time TEXT NOT NULL,
        frequency TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (medication_id) REFERENCES medications(id),
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);

    // Create alert_history table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS alert_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medication_id INTEGER,
        patient_id INTEGER,
        alert_type TEXT DEFAULT 'medication_due',
        message TEXT NOT NULL,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        acknowledged_at DATETIME,
        snoozed_until DATETIME,
        FOREIGN KEY (medication_id) REFERENCES medications(id),
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);

    // Insert sample data if tables are empty (with delay to ensure tables are created)
    setTimeout(() => {
      this.insertSampleData();
    }, 500);
  }

  insertSampleData() {
    // Check if we have any patients
    this.db.get('SELECT COUNT(*) as count FROM patients', (err, row) => {
      if (err) {
        console.error('Error checking patients:', err);
        return;
      }

      if (row.count === 0) {
        console.log('📝 Inserting sample data...');
        
        // Insert sample patient
        this.db.run(
          'INSERT INTO patients (name, email, phone) VALUES (?, ?, ?)',
          ['John Doe', 'john.doe@example.com', '+1-555-0123'],
          function(err) {
            if (err) {
              console.error('Error inserting sample patient:', err);
              return;
            }

            const patientId = this.lastID;
            console.log(`✅ Created sample patient with ID: ${patientId}`);

            // Insert sample medications
            const sampleMedications = [
              ['Aspirin', '100mg', 'daily'],
              ['Vitamin D', '1000 IU', 'daily'],
              ['Blood Pressure Med', '5mg', 'twice daily'],
              ['Insulin', '10 units', 'three times daily']
            ];

            sampleMedications.forEach(([name, dosage, frequency]) => {
              this.db.run(
                'INSERT INTO medications (patient_id, name, dosage, frequency) VALUES (?, ?, ?, ?)',
                [patientId, name, dosage, frequency],
                function(err) {
                  if (err) {
                    console.error(`Error inserting ${name}:`, err);
                  } else {
                    console.log(`✅ Added sample medication: ${name}`);
                  }
                }
              );
            });
          }
        );
      }
    });
  }

  getDB() {
    return this.db;
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('📁 Database connection closed');
        }
      });
    }
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;
