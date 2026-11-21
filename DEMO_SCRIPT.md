# CivicResolve – 3-Minute Live Hackathon Demo Script ⏱️

> **Target Audience**: Hackathon Judges & Civic Tech Evaluators  
> **Total Duration**: Exactly 3 Minutes (180 Seconds)  
> **Key Objective**: Prove sub-30s triage, Groq Cloud AI reasoning, transparent tracking, and secure admin resolution.

---

### [0:00 – 0:30] Introduction & The Problem Hook
* **Action**: Open [http://localhost:5173](http://localhost:5173) in browser.
* **Speaker**:
  > *"Judges, when a citizen reports an overflowing drain or a dangerous pothole today, it takes an average of 48 hours just to figure out which government department owns the problem. During monsoon, open high-voltage cables and sinkholes sit in generic queues with zero prioritization.*
  > 
  > *This is **CivicResolve**: an AI-powered municipal grievance intelligence platform built with React, Express, SQLite, and Groq Cloud ultra-fast AI."*
* **Visual**: Highlight the clean Gov-Tech landing page, live database metrics, and the 4-step workflow.

---

### [0:30 – 1:15] Live Citizen Grievance Filing & AI Triage
* **Action**: Click the teal **"Report an Issue"** button in the header.
* **Speaker**:
  > *"Let's submit a live emergency report. We'll click our quick test preset: **Deep Pothole Hazard**."*
* **Action**: Click the **"Deep Pothole Hazard"** preset button. Notice that Title, Description, Location, and Coordinates auto-fill.
* **Speaker**:
  > *"Notice that our browser's GPS auto-detects real coordinates, and the citizen attaches an image. Watch what happens when I click 'Submit & Trigger AI Triage'."*
* **Action**: Click **"Submit & Trigger AI Triage"**.
* **Speaker**:
  > *"In sub-second time, Groq Cloud AI analyzes the grievance, identifies it as a high-velocity road hazard, auto-allocates it to **Roads and Highways**, generates an emergency SLA target, and issues unique Reference ID **CR-2026-XXXX**."*
* **Visual**: Point to the AI Synthesis panel, confidence score (94%+), and safety hazard warning.

---

### [1:15 – 1:55] Interactive Geospatial Intelligence
* **Action**: Navigate to the **"Citizen Portal"** tab and toggle **"Map View"**.
* **Speaker**:
  > *"In the Citizen Portal, we don't just show a list—we map real incidents across the city. Notice our map integrity principle: we never invent fake coordinates. We clearly distinguish GPS-verified geotags from manual street addresses.*
  > 
  > *Markers are dynamically styled: critical hazards pulse in red, active reports are in amber/teal, and resolved tickets display in emerald green with verification checkmarks."*
* **Action**: Click any red or amber marker on the map to show the live incident popup.

---

### [1:55 – 2:35] Admin Command Center & Department Management
* **Action**: In the top navigation bar, click **"Admin Login"**. Click **"Auto-fill Demo Credentials"** and sign in.
* **Speaker**:
  > *"Now let's switch to the Municipal Officer view. Our Admin Command Center is protected by real bcrypt password hashing and signed JWT sessions. It provides 6 real-time operational KPIs pulled straight from SQLite, alongside Recharts category and priority analytics.*
  > 
  > *An officer can search, filter by department, and open any incident file. Let's manage our newly created pothole ticket."*
* **Action**: Click **"Manage"** on the latest complaint.
* **Speaker**:
  > *"Officers can override AI categories, reallocate to specialized field teams like 'Roads and Highways', update the status to 'In Progress', and append supervisor notes. Every single modification is immutably logged into SQLite with an audit trail."*
* **Action**: Set status to **"In Progress"**, add remarks *"Crew dispatched with asphalt roller"*, and click **"Save & Append to Audit Timeline"**.

---

### [2:35 – 3:00] Public Tracking & Conclusion
* **Action**: Navigate back to **"Citizen Portal"** and paste the Reference ID into the Tracker search bar.
* **Speaker**:
  > *"Finally, here is the public accountability loop: the citizen types their Reference ID, and in real-time, they see the exact visual stepper progress bar and the supervisor's official remarks.*
  > 
  > *CivicResolve transforms citizen grievance management from a black box into a transparent, sub-30-second AI-powered civic platform. Thank you, and we welcome your questions!"*
