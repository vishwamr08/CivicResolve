# CivicResolve — Problem Statement to Technical Implementation Matrix

## 1. Executive Summary & Objective

**CivicResolve: AI-Powered Citizen Grievance Management and Resolution** is an intelligent public grievance redressal and citizen-to-government resolution platform. Its core objective is to bridge the communication gap between citizens and municipal authorities across Tamil Nadu's 38 districts and 25 municipal corporations, inspired by Tamil Nadu CM Helpline (Mudhalvarin Mugavari) workflows.

---

## 2. Core Challenge Requirements Alignment (6 of 6 Mandated Features)

| Mandated Feature | Problem Statement Specification | Platform Implementation | UI Component | API Endpoint | Verification Suite |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Citizen Issue Reporting** | Title, description, location (GPS/geotag), category, optional photo evidence | Multi-step dynamic form with one-click GPS coordinate capture, reverse geocoding, and photo preview | `ComplaintFormModal.jsx` | `POST /api/complaints` (multipart/form-data) | `test_evaluation_complete.js` (Test 7.1) |
| **2. AI-Powered Classification** | Automated category classification powered by Google Gemini | Official `@google/genai` SDK (`gemini-2.5-flash`) with bilingual English, Tamil & Tanglish processing | `gemini-ai.js`, `AiAnalysisModal.jsx` | `POST /api/complaints` (automated during intake) | `test_evaluation_complete.js` (Test 6.4) |
| **3. Priority Detection** | Urgency and public safety hazard scoring | 4-tier urgency classification (`Low`, `Medium`, `High`, `Critical`) with statutory SLA computation | `gemini-ai.js`, `sla-engine.js` | `POST /api/complaints`, `GET /api/dashboard/stats` | `test_full_suite_master.js` (Tests 31-33) |
| **4. Department Recommendation** | Automated routing to responsible civic bodies | Intelligent dispatch to TANGEDCO, GCC, CMWSSB, TWAD, Highways, Drainage | `gemini-ai.js`, `AdminManageModal.jsx` | `POST /api/complaints`, `PATCH /api/complaints/:id/manage` | `test_evaluation_complete.js` (Test 7.3) |
| **5. Issue Tracking Dashboard** | Real-time status visibility (`Submitted`, `In Progress`, `Resolved`) | Stepper timeline, unique Reference ID search, and dual-engine map pins | `TrackingTimeline.jsx`, `ComplaintTracker.jsx`, `ComplaintMap.jsx` | `GET /api/complaints/track/:refId` | `test_evaluation_complete.js` (Test 7.4) |
| **6. Admin & Municipal Dashboard** | Review, status updates, officer assignment, and appeals | Filterable inbox, supervisor override controls, field photo verification, 7-day appeals | `AdminDashboard.jsx`, `AdminManageModal.jsx`, `OfficerPortal.jsx` | `GET /api/complaints`, `PATCH /api/complaints/:id/manage` | `test_full_suite_master.js` (Tests 25-30) |

---

## 3. Civic Grievance Typology & SLA Matrix

| Citizen Grievance Category | Target Civic Authority | Default SLA | Implemented Routing | Verification Test |
| :--- | :--- | :---: | :--- | :--- |
| **1. Road Damage / Potholes** | Roads & Highways Department (TN Highways / PWD) | 24 - 48 Hours | Asphalt leveling & crater repair | `test_full_suite_master.js` (Test 31) |
| **2. Water Leakage & Mains** | Chennai Metro Water (CMWSSB) / TWAD | 24 Hours | Drinking water pipeline repair squad | `test_evaluation_complete.js` |
| **3. Drainage & Sewage Sullage** | Stormwater Drainage & Flood Mitigation Division | 12 - 24 Hours | Super-sucker de-silting & manhole covers | `test_phase3_workflow.js` |
| **4. Solid Waste & Garbage** | Municipal Solid Waste & Sanitation Board | 12 - 24 Hours | Compactor truck & sanitary squad dispatch | `test_phase3_workflow.js` |
| **5. Streetlight Outage** | Urban Local Bodies Public Lighting Division | 24 Hours | Hydraulic ladder crane luminaire replacement | `test_full_suite_master.js` (Test 33) |
| **6. Electrical Hazards (Live Wires)** | Tamil Nadu Generation and Distribution Corp (TANGEDCO) | **6 Hours** (Emergency) | Immediate power isolation & cable splicing | `test_full_suite_master.js` (Test 32) |
| **7. Public Infrastructure** | Public Safety & Traffic Infrastructure Wing | 48 - 72 Hours | Bus shelters, parks, footpath restorations | `test_all_10_scenarios.js` |
| **8. Other Civic Matters** | Citizen Grievance Triage Desk | 48 Hours | General municipal duty officer verification | `test_groq_suite.js` |

---

## 4. Google Cloud Services Integration Architecture

```
+-----------------------------------------------------------------------------------+
|                           GOOGLE CLOUD SERVICES ALIGNMENT                         |
+--------------------------+----------------------------------+---------------------+
| Google Service           | Role in CivicResolve             | Technical File      |
+--------------------------+----------------------------------+---------------------+
| 1. Google Gemini         | Official @google/genai SDK with  | server/gemini-ai.js |
|    (gemini-2.5-flash)    | multimodal image & text triage,  | server/index.js     |
|                          | category & priority detection.   |                     |
+--------------------------+----------------------------------+---------------------+
| 2. Google Maps Platform  | Dynamic Maps JS loader, custom   | client/src/         |
|    (Maps JS & Geocode)   | colored pins, info windows &     | components/         |
|                          | reverse geocoding proxy.         | ComplaintMap.jsx    |
+--------------------------+----------------------------------+---------------------+
| 3. Google reCAPTCHA      | Server-side token verification   | server/index.js     |
|    (v2 / v3 Bot Defense) | preventing automated spam.       |                     |
+--------------------------+----------------------------------+---------------------+
```

---

## 5. Security & Statutory Accountability Alignment

1. **IDOR Elimination**: Citizen ownership is enforced via JWT token verification and registered phone/email matching before allowing status feedback or statutory appeal requests. Unauthorized requests receive HTTP 403 Forbidden.
2. **Cryptographic OTP Security**: 6-digit numeric OTPs are stored strictly as SHA-256 hashes in `citizen_otps` with 5-minute expiry, 3-attempt lockouts, and 60-second cooldown timers.
3. **Statutory 7-Day Appeal Flow**: Citizens have a statutory 7-day right to dispute unsatisfactory repairs, reopening tickets and escalating them to Zonal Executive Officers.
4. **WCAG 2.1 AA Accessibility**: Fully accessible skip-to-content keyboard navigation, `.sr-only` accessible HTML data tables for Recharts analytics and GIS maps, and explicit form label associations.
