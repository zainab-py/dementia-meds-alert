# streamlit_medication_ui.py

import streamlit as st
from datetime import datetime
from pymongo import MongoClient
import requests

def is_due(last_taken, frequency):
    if not last_taken:
        return True

    try:
        last_taken_dt = datetime.fromisoformat(last_taken)
    except ValueError:
        st.error(f"Invalid date format: {last_taken}")
        return False

    now = datetime.now()
    hours_since = (now - last_taken_dt).total_seconds() / 3600

    if 'daily' in frequency.lower():
        return hours_since >= 24
    elif 'twice' in frequency.lower():
        return hours_since >= 12
    return hours_since >= 8

# DB setup
client = MongoClient("mongodb://localhost:27017/")
db = client["dementia_support"]
med_logs = db["medication_logs"]
schedule = db["med_schedule"]
alerts = db["medication_alerts"]

st.title("🧠 Dementia Care: Medication Tracker")

# Log tracker
meds = list(schedule.find())

st.subheader("📋 Log Medications Taken")
for med in meds:
    if st.button(f"I've taken {med['name']}", key=str(med["_id"])):
        med_logs.insert_one({
            "med_id": med["_id"],
            "name": med["name"],
            "timestamp": datetime.now(),
            "date": datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        })
        st.success(f"✅ Recorded: {med['name']} taken")

# Medication Alerts from Node API
API_URL = "http://localhost:27017"
try:
    response = requests.get(API_URL)
    medications = response.json()
    st.header("🔔 Real-Time Alerts")
    for med in medications:
        if is_due(med['last_taken'], med['frequency']):
            st.warning(f"⚠️ {med['name']} ({med['dosage']}) is due now!")
except Exception as e:
    st.error(f"Error fetching medications: {e}")

# Past alerts (from MongoDB)
st.header("📅 Missed Alerts History")
for alert in alerts.find().sort("timestamp", -1).limit(5):
    st.info(f"[{alert['timestamp'].strftime('%b %d %H:%M')}] {alert['message']}")
