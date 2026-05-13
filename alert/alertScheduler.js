// alertScheduler.js - Background service for scheduling and managing medication alerts

const cron = require('node-cron');
const database = require('./database/database.cjs');

class AlertScheduler {
  constructor() {
    this.db = database.getDB();
    this.scheduledTasks = new Map();
    this.isRunning = false;
    
    this.initializeDatabase();
  }

  // Initialize alert-related database tables
  initializeDatabase() {
    // Create alert_schedules table for managing recurring alerts
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

    // Create alert_history table for tracking sent alerts
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
  }

  // Start the alert scheduler
  start() {
    if (this.isRunning) {
      console.log('Alert scheduler is already running');
      return;
    }

    console.log('Starting medication alert scheduler...');
    this.isRunning = true;

    // Schedule to check for due medications every 15 minutes
    this.scheduledTasks.set('medication-check', cron.schedule('*/15 * * * *', () => {
      this.checkDueMedications();
    }, {
      scheduled: true,
      timezone: "America/New_York" // Adjust timezone as needed
    }));

    // Schedule daily cleanup of old notifications at midnight
    this.scheduledTasks.set('daily-cleanup', cron.schedule('0 0 * * *', () => {
      this.cleanupOldNotifications();
    }, {
      scheduled: true,
      timezone: "America/New_York"
    }));

    // Schedule to check for custom alert times every minute
    this.scheduledTasks.set('custom-alerts', cron.schedule('* * * * *', () => {
      this.checkCustomAlerts();
    }, {
      scheduled: true,
      timezone: "America/New_York"
    }));

    console.log('Alert scheduler started successfully');
  }

  // Stop the alert scheduler
  stop() {
    if (!this.isRunning) {
      console.log('Alert scheduler is not running');
      return;
    }

    console.log('Stopping medication alert scheduler...');
    
    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      console.log(`Stopped task: ${name}`);
    });
    
    this.scheduledTasks.clear();
    this.isRunning = false;
    
    console.log('Alert scheduler stopped');
  }

  // Check for due medications and create notifications
  checkDueMedications() {
    console.log('Checking for due medications...');
    
    const query = `
      SELECT m.*, p.name as patient_name 
      FROM medications m 
      LEFT JOIN patients p ON m.patient_id = p.id 
      WHERE m.patient_id IS NOT NULL
    `;

    this.db.all(query, [], (err, medications) => {
      if (err) {
        console.error('Error fetching medications:', err);
        return;
      }

      const now = new Date();
      let alertsCreated = 0;

      medications.forEach(med => {
        if (this.isMedicationDue(med, now)) {
          this.createMedicationAlert(med);
          alertsCreated++;
        }
      });

      if (alertsCreated > 0) {
        console.log(`Created ${alertsCreated} medication alerts`);
      }
    });
  }

  // Check for custom scheduled alerts
  checkCustomAlerts() {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    const query = `
      SELECT alert_schedules.*, m.name as medication_name, m.dosage, p.name as patient_name
      FROM alert_schedules
      LEFT JOIN medications m ON alert_schedules.medication_id = m.id
      LEFT JOIN patients p ON alert_schedules.patient_id = p.id
      WHERE alert_schedules.is_active = 1 AND alert_schedules.alert_time = ?
    `;

    this.db.all(query, [currentTime], (err, schedules) => {
      if (err) {
        console.error('Error fetching alert schedules:', err);
        return;
      }

      schedules.forEach(schedule => {
        if (this.shouldTriggerAlert(schedule, currentDay)) {
          this.createScheduledAlert(schedule);
        }
      });
    });
  }

  // Determine if a scheduled alert should trigger based on frequency
  shouldTriggerAlert(schedule, currentDay) {
    const frequency = schedule.frequency.toLowerCase();
    
    if (frequency === 'daily') {
      return true;
    } else if (frequency === 'weekdays' && currentDay >= 1 && currentDay <= 5) {
      return true;
    } else if (frequency === 'weekends' && (currentDay === 0 || currentDay === 6)) {
      return true;
    } else if (frequency.includes('monday') && currentDay === 1) {
      return true;
    } else if (frequency.includes('tuesday') && currentDay === 2) {
      return true;
    } else if (frequency.includes('wednesday') && currentDay === 3) {
      return true;
    } else if (frequency.includes('thursday') && currentDay === 4) {
      return true;
    } else if (frequency.includes('friday') && currentDay === 5) {
      return true;
    } else if (frequency.includes('saturday') && currentDay === 6) {
      return true;
    } else if (frequency.includes('sunday') && currentDay === 0) {
      return true;
    }
    
    return false;
  }

  // Check if medication is due
  isMedicationDue(medication, currentTime = new Date()) {
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
    
    return hoursSinceLastTaken >= 8; // Default
  }

  // Create medication due alert
  createMedicationAlert(medication) {
    const message = `${medication.name} (${medication.dosage}) is due now!`;
    
    // Check if alert already exists for today
    const today = new Date().toISOString().split('T')[0];
    
    this.db.get(
      'SELECT id FROM notifications WHERE medication_id = ? AND DATE(created_at) = ? AND type = "medication_due"',
      [medication.id, today],
      (err, existingNotification) => {
        if (err) {
          console.error('Error checking existing notification:', err);
          return;
        }
        
        if (!existingNotification) {
          // Create notification
          this.db.run(
            'INSERT INTO notifications (patient_id, medication_id, message, type) VALUES (?, ?, ?, ?)',
            [medication.patient_id, medication.id, message, 'medication_due'],
            function(err) {
              if (err) {
                console.error('Error creating notification:', err);
              } else {
                console.log(`Created notification for ${medication.name}`);
              }
            }
          );

          // Log to alert history
          this.db.run(
            'INSERT INTO alert_history (medication_id, patient_id, message, alert_type) VALUES (?, ?, ?, ?)',
            [medication.id, medication.patient_id, message, 'medication_due']
          );
        }
      }
    );
  }

  // Create scheduled alert
  createScheduledAlert(schedule) {
    const message = `Reminder: Time to take ${schedule.medication_name} (${schedule.dosage})`;
    
    // Create notification
    this.db.run(
      'INSERT INTO notifications (patient_id, medication_id, message, type) VALUES (?, ?, ?, ?)',
      [schedule.patient_id, schedule.medication_id, message, 'scheduled_reminder'],
      function(err) {
        if (err) {
          console.error('Error creating scheduled notification:', err);
        } else {
          console.log(`Created scheduled reminder for ${schedule.medication_name}`);
        }
      }
    );

    // Log to alert history
    this.db.run(
      'INSERT INTO alert_history (medication_id, patient_id, message, alert_type) VALUES (?, ?, ?, ?)',
      [schedule.medication_id, schedule.patient_id, message, 'scheduled_reminder']
    );
  }

  // Clean up old notifications (older than 7 days)
  cleanupOldNotifications() {
    console.log('Cleaning up old notifications...');
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    this.db.run(
      'DELETE FROM notifications WHERE created_at < ? AND (is_dismissed = 1 OR is_read = 1)',
      [sevenDaysAgo.toISOString()],
      function(err) {
        if (err) {
          console.error('Error cleaning up notifications:', err);
        } else {
          console.log(`Cleaned up ${this.changes} old notifications`);
        }
      }
    );

    // Clean up old alert history (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    this.db.run(
      'DELETE FROM alert_history WHERE sent_at < ?',
      [thirtyDaysAgo.toISOString()],
      function(err) {
        if (err) {
          console.error('Error cleaning up alert history:', err);
        } else {
          console.log(`Cleaned up ${this.changes} old alert history records`);
        }
      }
    );
  }

  // Add custom alert schedule
  addAlertSchedule(medicationId, patientId, alertTime, frequency) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO alert_schedules (medication_id, patient_id, alert_time, frequency) VALUES (?, ?, ?, ?)',
        [medicationId, patientId, alertTime, frequency],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  // Remove alert schedule
  removeAlertSchedule(scheduleId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE alert_schedules SET is_active = 0 WHERE id = ?',
        [scheduleId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes > 0);
          }
        }
      );
    });
  }
}

// Create singleton instance
const alertScheduler = new AlertScheduler();

module.exports = alertScheduler;
