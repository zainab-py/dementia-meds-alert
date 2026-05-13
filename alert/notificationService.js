// notificationService.js - Comprehensive notification service for medication tracking

class NotificationService {
  constructor() {
    this.notifications = [];
    this.subscribers = [];
    this.settings = {
      enableBrowserNotifications: true,
      enableSoundAlerts: true,
      enableVisualAlerts: true,
      snoozeTime: 15, // minutes
      reminderInterval: 60 // minutes
    };

    this.initializeBrowserNotifications();
  }

  // Initialize browser notification permissions
  async initializeBrowserNotifications() {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    }
  }

  // Subscribe to notification updates
  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  // Notify all subscribers
  notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.notifications));
  }

  // Add a new notification
  addNotification(notification) {
    const newNotification = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      isRead: false,
      isDismissed: false,
      priority: 'medium',
      ...notification
    };

    this.notifications.unshift(newNotification);
    this.notifySubscribers();

    // Trigger browser notification if enabled
    if (this.settings.enableBrowserNotifications && notification.type === 'medication_due') {
      this.showBrowserNotification(newNotification);
    }

    // Trigger sound alert if enabled
    if (this.settings.enableSoundAlerts && notification.priority === 'high') {
      this.playAlertSound();
    }

    return newNotification.id;
  }

  // Show browser notification
  showBrowserNotification(notification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title || 'Medication Reminder', {
        body: notification.message,
        icon: '💊',
        badge: '💊',
        tag: `medication-${notification.medicationId}`,
        requireInteraction: true,
        actions: [
          { action: 'taken', title: 'Mark as Taken' },
          { action: 'snooze', title: 'Snooze 15 min' }
        ]
      });

      browserNotification.onclick = () => {
        window.focus();
        this.markAsRead(notification.id);
        browserNotification.close();
      };

      // Auto-close after 10 seconds if not interacted with
      setTimeout(() => {
        browserNotification.close();
      }, 10000);
    }
  }

  // Play alert sound
  playAlertSound() {
    try {
      // Create audio context for alert sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Could not play alert sound:', error);
    }
  }

  // Mark notification as read
  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      this.notifySubscribers();
    }
  }

  // Dismiss notification
  dismiss(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isDismissed = true;
      this.notifySubscribers();
    }
  }

  // Snooze notification
  snooze(notificationId, minutes = null) {
    const snoozeTime = minutes || this.settings.snoozeTime;
    const notification = this.notifications.find(n => n.id === notificationId);

    if (notification) {
      notification.isDismissed = true;
      notification.snoozedUntil = new Date(Date.now() + snoozeTime * 60 * 1000);
      this.notifySubscribers();

      // Set timeout to re-show notification
      setTimeout(() => {
        if (notification.snoozedUntil && new Date() >= notification.snoozedUntil) {
          notification.isDismissed = false;
          notification.snoozedUntil = null;
          this.notifySubscribers();

          // Show browser notification again
          if (this.settings.enableBrowserNotifications) {
            this.showBrowserNotification(notification);
          }
        }
      }, snoozeTime * 60 * 1000);
    }
  }

  // Get active notifications (not dismissed and not snoozed)
  getActiveNotifications() {
    const now = new Date();
    return this.notifications.filter(n =>
      !n.isDismissed &&
      (!n.snoozedUntil || now >= n.snoozedUntil)
    );
  }

  // Get unread notifications count
  getUnreadCount() {
    return this.getActiveNotifications().filter(n => !n.isRead).length;
  }

  // Clear all notifications
  clearAll() {
    this.notifications = [];
    this.notifySubscribers();
  }

  // Update settings
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }

  // Check medications and create notifications
  checkMedicationsAndNotify(medications) {
    const now = new Date();
    const dueMedications = medications.filter(med => this.isMedicationDue(med, now));

    dueMedications.forEach(med => {
      // Check if we already have an active notification for this medication today
      const today = now.toDateString();
      const existingNotification = this.notifications.find(n =>
        n.medicationId === med.id &&
        n.timestamp.toDateString() === today &&
        !n.isDismissed
      );

      if (!existingNotification) {
        this.addNotification({
          type: 'medication_due',
          title: 'Medication Due',
          message: `${med.name} (${med.dosage}) is due now!`,
          medicationId: med.id,
          medicationName: med.name,
          priority: 'high'
        });
      }
    });

    return dueMedications;
  }

  // Helper function to check if medication is due
  isMedicationDue(medication, currentTime = new Date()) {
    if (!medication.lastTaken && !medication.last_taken) return true;

    const lastTaken = new Date(medication.lastTaken || medication.last_taken);
    const hoursSinceLastTaken = (currentTime - lastTaken) / (1000 * 60 * 60);

    const frequency = (medication.frequency || '').toLowerCase();

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
}

// Create singleton instance
const notificationService = new NotificationService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationService;
} else {
  window.NotificationService = NotificationService;
  window.notificationService = notificationService;
}