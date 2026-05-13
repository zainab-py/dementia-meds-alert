# 💊 Medication Tracker with Notifications

A comprehensive medication tracking system with advanced notification and alert capabilities.

## 🚀 Features

### Core Functionality
- **Medication Management**: Add, edit, and track medications
- **Patient Management**: Support for multiple patients
- **Dosage Tracking**: Track when medications are taken

### Notification System
- **Real-time Alerts**: Instant notifications when medications are due
- **Browser Notifications**: Native browser notification support
- **Sound Alerts**: Audio alerts for high-priority notifications
- **Visual Alerts**: In-app visual notification system
- **Snooze Functionality**: Snooze notifications for 15 minutes or custom duration
- **Smart Scheduling**: Automatic medication due checking based on frequency

### Advanced Features
- **Background Scheduler**: Automated alert checking using cron jobs
- **Custom Alert Times**: Set specific times for medication reminders
- **Notification History**: Track all sent notifications and alerts
- **Settings Management**: Customize notification preferences
- **Responsive Design**: Works on desktop and mobile devices

## 📁 File Structure

```
├── medications.cjs           # Backend API routes for medications and notifications
├── medication.jsx           # React component for medication tracking
├── medication.js            # Medication model with validation
├── notificationService.js   # Frontend notification service
├── NotificationComponent.jsx # React notification UI component
├── alertScheduler.js        # Background alert scheduling service
├── server.js               # Main Express server
├── medication-demo.html    # Demo page showcasing the system
├── database/
│   └── database.cjs        # SQLite database setup and management
├── package.json            # Node.js dependencies
└── README.md              # This file
```

## 🛠️ Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```

3. **Access the Demo**
   Open your browser to `http://localhost:3000`

## 📊 API Endpoints

### Medications
- `GET /api/medications/patient/:patientId` - Get medications for a patient
- `POST /api/medications` - Add new medication
- `PUT /api/medications/:id` - Update medication (mark as taken)
- `DELETE /api/medications/:id` - Delete medication

### Notifications
- `GET /api/medications/notifications/:patientId` - Get notifications for a patient
- `PUT /api/medications/notifications/:id/read` - Mark notification as read
- `PUT /api/medications/notifications/:id/dismiss` - Dismiss notification
- `POST /api/medications/check-due/:patientId` - Check for due medications

## 🔧 Configuration

### Notification Settings
The notification system can be customized with the following settings:

```javascript
{
  enableBrowserNotifications: true,  // Enable browser notifications
  enableSoundAlerts: true,          // Enable sound alerts
  enableVisualAlerts: true,         // Enable visual alerts
  snoozeTime: 15,                   // Default snooze time in minutes
  reminderInterval: 60              // Check interval in minutes
}
```

### Alert Scheduler
The background scheduler runs the following tasks:
- **Medication Check**: Every 15 minutes
- **Custom Alerts**: Every minute
- **Cleanup**: Daily at midnight

## 💡 Usage Examples

### Adding a Medication
```javascript
const medication = {
  patientId: 1,
  name: "Aspirin",
  dosage: "100mg",
  frequency: "daily"
};

// Add via API
fetch('/api/medications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(medication)
});
```

### Creating a Notification
```javascript
notificationService.addNotification({
  type: 'medication_due',
  title: 'Medication Due',
  message: 'Aspirin (100mg) is due now!',
  medicationId: 1,
  priority: 'high'
});
```

### Checking Due Medications
```javascript
const dueMedications = notificationService.checkMedicationsAndNotify(medications);
console.log(`Found ${dueMedications.length} due medications`);
```

## 🎯 Demo Features

The included demo (`medication-demo.html`) showcases:

1. **Add Sample Medications**: Quickly add test medications
2. **Simulate Due Medications**: Test the notification system
3. **Browser Notifications**: Test native browser notifications
4. **Interactive Notifications**: Mark as taken, snooze, or dismiss
5. **Real-time Updates**: See notifications update in real-time

## 🔔 Notification Types

### Medication Due
- Triggered when a medication is due based on frequency
- High priority with sound and visual alerts
- Actions: Mark as Taken, Snooze, Dismiss

### Scheduled Reminders
- Custom time-based reminders
- Configurable frequency (daily, weekdays, specific days)
- Actions: Acknowledge, Snooze, Dismiss

### System Notifications
- General system messages and updates
- Medium priority
- Actions: Read, Dismiss

## 🛡️ Browser Compatibility

- **Chrome**: Full support including notifications and sound
- **Firefox**: Full support including notifications and sound
- **Safari**: Full support with notification permission
- **Edge**: Full support including notifications and sound

## 📱 Mobile Support

The system is fully responsive and works on mobile devices with:
- Touch-friendly interface
- Mobile-optimized notifications
- Responsive design for all screen sizes

## 🔧 Development

### Running in Development Mode
```bash
npm run dev
```

### Database
The system uses SQLite for simplicity. The database file is created automatically at `database/medications.db`.

### Adding New Notification Types
1. Define the type in `notificationService.js`
2. Add handling in `NotificationComponent.jsx`
3. Update the backend API if needed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues or questions:
1. Check the demo at `http://localhost:3000`
2. Review the console for error messages
3. Ensure browser notifications are enabled
4. Check that the server is running properly

---

**Happy Medication Tracking! 💊✨**
