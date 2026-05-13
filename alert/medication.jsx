import React, { useState, useEffect } from 'react';
import NotificationComponent from './NotificationComponent.jsx';

const MedicationTracker = ({ medications = [], setMedications, readOnly }) => {
  const [med, setMed] = useState({
    name: '',
    dosage: '',
    times: {
      morning: false,
      lunch: false,
      dinner: false,
      emptyStomach: false
    }
  });

  // Initialize notification service
  const [notificationService, setNotificationService] = useState(null);

  useEffect(() => {
    // Initialize notification service when component mounts
    if (typeof window !== 'undefined' && window.notificationService) {
      setNotificationService(window.notificationService);
    } else if (typeof window !== 'undefined' && window.NotificationService) {
      const service = new window.NotificationService();
      window.notificationService = service;
      setNotificationService(service);
    }
  }, []);

  // Convert medications to format expected by notification service
  const convertMedicationsForNotifications = (meds) => {
    return meds.map(medication => ({
      id: medication.id,
      name: medication.name,
      dosage: medication.dosage,
      frequency: getFrequencyFromTimes(medication.times),
      lastTaken: getLastTakenTime(medication)
    }));
  };

  // Helper function to convert times to frequency string
  const getFrequencyFromTimes = (times) => {
    if (!times) return 'daily';

    const selectedTimes = Object.entries(times).filter(([_, selected]) => selected);
    const count = selectedTimes.length;

    if (count === 1) return 'once daily';
    if (count === 2) return 'twice daily';
    if (count === 3) return 'three times daily';
    if (count === 4) return 'four times daily';

    return 'daily';
  };

  // Helper function to get last taken time
  const getLastTakenTime = (medication) => {
    if (!medication.completedTimes) return null;

    const now = new Date();
    const today = now.toDateString();

    // Check if any dose was taken today
    const takenToday = Object.values(medication.completedTimes).some(taken => taken);

    if (takenToday) {
      // Return current time if taken today (simplified)
      return now.toISOString();
    }

    return null; // Not taken today
  };

  // Handle medication taken from notification
  const handleMedicationTakenFromNotification = (medicationId) => {
    const medIndex = medications.findIndex(med => med.id === medicationId);
    if (medIndex !== -1 && typeof setMedications === 'function') {
      const updatedMedications = [...medications];
      const medication = updatedMedications[medIndex];

      // Mark the next available time as taken
      const availableTimes = Object.entries(medication.times || {})
        .filter(([time, scheduled]) => scheduled && !medication.completedTimes?.[time]);

      if (availableTimes.length > 0) {
        const [nextTime] = availableTimes[0];
        updatedMedications[medIndex] = {
          ...medication,
          completedTimes: {
            ...medication.completedTimes,
            [nextTime]: true
          }
        };
        setMedications(updatedMedications);
      }
    }
  };

  const handleChange = (e) => {
    setMed({ ...med, [e.target.name]: e.target.value });
  };

  const handleTimeChange = (time) => {
    setMed({
      ...med,
      times: {
        ...med.times,
        [time]: !med.times[time]
      }
    });
  };

  const handleAdd = () => {
    if (!med.name || !med.dosage) {
      alert('Please fill in both Medication Name and Dosage');
      return;
    }

    // Check if at least one time is selected
    const hasSelectedTime = Object.values(med.times).some(time => time);
    if (!hasSelectedTime) {
      alert('Please select at least one time for the medication');
      return;
    }

    const newMedication = {
      ...med,
      id: Date.now(), // Simple ID generation
      completedTimes: {
        morning: false,
        lunch: false,
        dinner: false,
        emptyStomach: false
      },
      dateAdded: new Date().toISOString().split('T')[0]
    };

    if (typeof setMedications === 'function') {
      const newMedications = [...(Array.isArray(medications) ? medications : []), newMedication];
      setMedications(newMedications);
    }

    setMed({
      name: '',
      dosage: '',
      times: {
        morning: false,
        lunch: false,
        dinner: false,
        emptyStomach: false
      }
    });
  };

  const toggleMedicationCompletion = (medIndex, time) => {
    if (typeof setMedications === 'function') {
      const updatedMedications = medications.map((medication, index) => {
        if (index === medIndex) {
          return {
            ...medication,
            completedTimes: {
              ...medication.completedTimes,
              [time]: !medication.completedTimes[time]
            }
          };
        }
        return medication;
      });
      setMedications(updatedMedications);
    }
  };

  const timeLabels = {
    morning: '🌅 Morning',
    lunch: '🌞 Lunch',
    dinner: '🌙 Dinner',
    emptyStomach: '🫗on Empty Stomach'
  };

  return (
    <div className="section">
      <h4>💊 Medication Tracker</h4>

      {/* Notification Component */}
      {notificationService && (
        <NotificationComponent
          medications={convertMedicationsForNotifications(medications)}
          onMedicationTaken={handleMedicationTakenFromNotification}
          notificationService={notificationService}
        />
      )}
      {!readOnly && typeof setMedications === 'function' && (
        <div style={{ marginBottom: '1rem', background: '#f9f9f9', padding: '1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              name="name"
              placeholder="Medication Name"
              value={med.name}
              onChange={handleChange}
              style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
            />
            <input
              name="dosage"
              placeholder="Dosage (e.g., 100mg)"
              value={med.dosage}
              onChange={handleChange}
              style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#333' }}>
              Select medication times:
            </label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {Object.entries(timeLabels).map(([time, label]) => (
                <label key={time} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={med.times[time]}
                    onChange={() => handleTimeChange(time)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            style={{
              background: '#2563eb',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Add Medication
          </button>
        </div>
      )}

      {(!medications || medications.length === 0) ? (
        <p style={{ color: '#718096', fontSize: '0.9rem' }}>No medications recorded</p>
      ) : (
        <div>
          {medications.map((medication, medIndex) => (
            <div key={medIndex} style={{
              background: '#fff',
              padding: '1rem',
              marginBottom: '1rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong style={{ fontSize: '1.1rem', color: '#2d3748' }}>{medication.name}</strong>
                <span style={{ marginLeft: '0.5rem', color: '#718096' }}>- {medication.dosage}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
                {Object.entries(timeLabels).map(([time, label]) => {
                  if (!medication.times || !medication.times[time]) return null;

                  const isCompleted = medication.completedTimes && medication.completedTimes[time] === true;

                  return (
                    <label
                      key={time}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: readOnly ? 'default' : 'pointer',
                        padding: '0.5rem',
                        background: isCompleted ? '#f0fff4' : '#fafafa',
                        borderRadius: '4px',
                        border: `1px solid ${isCompleted ? '#68d391' : '#e2e8f0'}`,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={() => !readOnly && toggleMedicationCompletion(medIndex, time)}
                        disabled={readOnly}
                        style={{ transform: 'scale(1.2)' }}
                      />
                      <span style={{
                        fontSize: '0.9rem',
                        textDecoration: isCompleted ? 'line-through' : 'none',
                        opacity: isCompleted ? 0.7 : 1
                      }}>
                        {label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};






export default MedicationTracker;