import React, { useState, useEffect } from 'react';

const NotificationComponent = ({ 
  medications = [], 
  onMedicationTaken = () => {},
  notificationService = null 
}) => {
  const [notifications, setNotifications] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    enableBrowserNotifications: true,
    enableSoundAlerts: true,
    enableVisualAlerts: true,
    snoozeTime: 15,
    reminderInterval: 60
  });

  useEffect(() => {
    if (notificationService) {
      // Subscribe to notification updates
      const unsubscribe = notificationService.subscribe(setNotifications);
      
      // Check medications on mount and set up interval
      notificationService.checkMedicationsAndNotify(medications);
      
      const interval = setInterval(() => {
        notificationService.checkMedicationsAndNotify(medications);
      }, settings.reminderInterval * 60 * 1000);

      return () => {
        unsubscribe();
        clearInterval(interval);
      };
    }
  }, [medications, notificationService, settings.reminderInterval]);

  const activeNotifications = notifications.filter(n => 
    !n.isDismissed && (!n.snoozedUntil || new Date() >= n.snoozedUntil)
  );

  const unreadCount = activeNotifications.filter(n => !n.isRead).length;

  const handleMarkAsTaken = (notification) => {
    if (notification.medicationId) {
      onMedicationTaken(notification.medicationId);
      notificationService?.dismiss(notification.id);
    }
  };

  const handleSnooze = (notification, minutes = 15) => {
    notificationService?.snooze(notification.id, minutes);
  };

  const handleDismiss = (notification) => {
    notificationService?.dismiss(notification.id);
  };

  const handleMarkAsRead = (notification) => {
    notificationService?.markAsRead(notification.id);
  };

  const updateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    notificationService?.updateSettings(newSettings);
  };

  const NotificationItem = ({ notification }) => {
    const isHighPriority = notification.priority === 'high';
    const isMedicationDue = notification.type === 'medication_due';

    return (
      <div
        className={`notification-item ${isHighPriority ? 'high-priority' : ''} ${!notification.isRead ? 'unread' : ''}`}
        style={{
          background: isHighPriority ? '#fef2f2' : '#f9fafb',
          border: `2px solid ${isHighPriority ? '#fca5a5' : '#e5e7eb'}`,
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '0.5rem',
          position: 'relative',
          animation: isHighPriority ? 'pulse 2s infinite' : 'none'
        }}
        onClick={() => handleMarkAsRead(notification)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>
                {isMedicationDue ? '💊' : '🔔'}
              </span>
              <strong style={{ color: isHighPriority ? '#dc2626' : '#374151' }}>
                {notification.title || 'Notification'}
              </strong>
              {!notification.isRead && (
                <span style={{
                  background: '#3b82f6',
                  color: 'white',
                  fontSize: '0.75rem',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '9999px'
                }}>
                  NEW
                </span>
              )}
            </div>
            
            <p style={{ margin: '0 0 0.75rem 0', color: '#6b7280' }}>
              {notification.message}
            </p>
            
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {notification.timestamp.toLocaleTimeString()}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginLeft: '1rem' }}>
            {isMedicationDue && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkAsTaken(notification);
                }}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                ✓ Taken
              </button>
            )}
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSnooze(notification, 15);
              }}
              style={{
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              😴 15m
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss(notification);
              }}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  };

  const SettingsPanel = () => (
    <div style={{
      background: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '1rem'
    }}>
      <h4 style={{ margin: '0 0 1rem 0' }}>🔧 Notification Settings</h4>
      
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={settings.enableBrowserNotifications}
            onChange={(e) => updateSettings({ enableBrowserNotifications: e.target.checked })}
          />
          <span>Browser notifications</span>
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={settings.enableSoundAlerts}
            onChange={(e) => updateSettings({ enableSoundAlerts: e.target.checked })}
          />
          <span>Sound alerts</span>
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={settings.enableVisualAlerts}
            onChange={(e) => updateSettings({ enableVisualAlerts: e.target.checked })}
          />
          <span>Visual alerts</span>
        </label>
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.25rem' }}>
            Snooze time (minutes):
          </label>
          <input
            type="number"
            min="5"
            max="120"
            value={settings.snoozeTime}
            onChange={(e) => updateSettings({ snoozeTime: parseInt(e.target.value) })}
            style={{
              width: '80px',
              padding: '0.25rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px'
            }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.25rem' }}>
            Check interval (minutes):
          </label>
          <input
            type="number"
            min="1"
            max="1440"
            value={settings.reminderInterval}
            onChange={(e) => updateSettings({ reminderInterval: parseInt(e.target.value) })}
            style={{
              width: '80px',
              padding: '0.25rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px'
            }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="notification-component" style={{ marginBottom: '1rem' }}>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
          
          .notification-item.high-priority {
            box-shadow: 0 0 0 2px #fca5a5;
          }
          
          .notification-item.unread {
            font-weight: 500;
          }
          
          .notification-item:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            transition: all 0.2s ease;
          }
        `}
      </style>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🔔 Notifications
          {unreadCount > 0 && (
            <span style={{
              background: '#dc2626',
              color: 'white',
              fontSize: '0.75rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '9999px',
              minWidth: '1.5rem',
              textAlign: 'center'
            }}>
              {unreadCount}
            </span>
          )}
        </h3>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: '#6b7280',
              color: 'white',
              border: 'none',
              padding: '0.5rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            ⚙️
          </button>
          
          {activeNotifications.length > 0 && (
            <button
              onClick={() => notificationService?.clearAll()}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '0.5rem 0.75rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {showSettings && <SettingsPanel />}

      <div className="notifications-list">
        {activeNotifications.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#6b7280',
            background: '#f9fafb',
            borderRadius: '8px',
            border: '1px dashed #d1d5db'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            <p>No active notifications</p>
          </div>
        ) : (
          activeNotifications.map(notification => (
            <NotificationItem key={notification.id} notification={notification} />
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationComponent;
