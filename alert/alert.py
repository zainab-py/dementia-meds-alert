# alert.py

import requests
from datetime import datetime
from pymongo import MongoClient

API_URL = "http://localhost:27017"  # Adjust ID dynamically if needed

def is_due(last_taken, frequency):
    if not last_taken:
        return True

    try:
        last_taken_dt = datetime.fromisoformat(last_taken)
    except ValueError:
        return False

    now = datetime.now()
    hours_since = (now - last_taken_dt).total_seconds() / 3600

    frequency = frequency.lower()
    if 'daily' in frequency:
        return hours_since >= 24
    elif 'twice' in frequency:
        return hours_since >= 12
    return hours_since >= 8

def check_and_alert():
    response = requests.get(API_URL)
    meds = response.json()

    client = MongoClient("mongodb://localhost:27017/")
    db = client["dementia_support"]
    alerts = db["medication_alerts"]

    for med in meds:
        if is_due(med['last_taken'], med['frequency']):
            alert_msg = f"{med['name']} ({med['dosage']}) is due!"
            existing = alerts.find_one({"name": med['name'], "date": datetime.now().date()})

            if not existing:
                alerts.insert_one({
                    "name": med['name'],
                    "message": alert_msg,
                    "timestamp": datetime.now(),
                    "date": datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                })
                print(f"Alert logged: {alert_msg}")

if __name__ == "__main__":
    check_and_alert()
