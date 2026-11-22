# CivicResolve — Municipal Demonstration & Evaluation Guide

> **Notice:** CivicResolve is a pilot / demonstration platform. This guide provides a structured 10-minute demonstration script for municipal officials, smart city commissioners, and technical evaluators.

---

## 1. Demonstration Scenario Overview

The demonstration showcases the complete lifecycle of a citizen grievance in Tamil Nadu:
1. Citizen logs in via mobile OTP and GPS-located incident submission.
2. AI triage categorizes the severity and routes the grievance.
3. Municipal Administrator reviews, assigns, and escalates the work order.
4. Field Officer executes the remediation and attaches photographic evidence.
5. Citizen receives real-time status updates and provides 5-star feedback.

---

## 2. Step-by-Step 10-Minute Demonstration Script

### Segment 1: Public Transparency & Cold-Start Resilience (Minutes 0–2)
1. Open the landing page: `https://civicresolve-yc9v.onrender.com/`
2. Point out the bilingual language switcher in the header (toggle **English** / **தமிழ்**).
3. Demonstrate the **Public Transparency Dashboard**:
   - Total complaints logged statewide across Tamil Nadu.
   - Live resolution rate and SLA compliance metrics.
   - Interactive GIS complaint cluster map.

### Segment 2: Citizen Mobile Authentication & Filing (Minutes 2–5)
1. Click **File Complaint** / **மனு பதிவு**.
2. Sign in using test mobile number: `9840123456`.
3. Highlight returning citizen recognition: profile (Ward 114, Teynampet, Greater Chennai Corporation) is automatically recognized.
4. Walk through the submission wizard:
   - Select **Road Damage** / **சாலை சேதம்**.
   - Click **Detect Location** to demonstrate GPS coordinate acquisition.
   - Note automatic GIS bounding check (validates location inside Tamil Nadu state borders).
   - Enter title: `Deep pothole outside school gate requiring urgent cold-patch repair`.
   - Submit and display the generated **Reference ID** (e.g., `CR-TN-2026-XXXXXX`).

### Segment 3: Officer Portal & Field Remediation (Minutes 5–8)
1. Log in to the Officer Portal using:
   - Email: `gcc.officer@civicresolve.gov`
   - Password: `CivicAdmin#2026!Secure`
2. Locate the newly filed grievance at the top of the assigned work orders queue.
3. Click **Update Progress**:
   - Change status to **In Progress**.
   - Enter remark: `Emergency asphalt patching van dispatched from Zonal Depot 9`.
   - Add photo URL: `https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800`.
   - Mark as **Resolved**.
4. Save report. Note the immutable entry created in `audit_logs`.

### Segment 4: Citizen Verification, Feedback & Appeals (Minutes 8–10)
1. Return to the Citizen Portal or Public Tracker.
2. Search the Reference ID.
3. Show the completed status timeline with officer remarks and photographic evidence.
4. Click **Rate Resolution** and submit a 5-star citizen rating.
5. Demonstrate the **Appeal** mechanism: show how citizens can reopen unsatisfactory grievances directly to Zonal Supervisors.
