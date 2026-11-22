# CivicResolve — Known Limitations & Production Architecture Notes

> **Notice:** CivicResolve is a pilot / demonstration application. It is not an officially commissioned government portal unless formally authorized. The following technical and operational limitations should be considered during evaluation and future development phases.

---

## 1. Hosting & Storage Limitations

1. **Render Free Tier Storage Ephemerality:**
   - Free tier Render web services operate on ephemeral containers without persistent disks. When the container sleeps or redeploys, SQLite database changes on the container filesystem are reset.
   - **Resolution:** Render **Starter** plan ($7/month) with persistent disk attachment (`/var/data`, 1 GB) or migration to a cloud-managed database (e.g. PostgreSQL or Turso) is required for 100% cloud persistence.
2. **Cold Start Latency on Free Tier:**
   - On free tier, instances spin down after 15 minutes of inactivity. Cold start boot latency ranges from 15 to 30 seconds. CivicResolve includes frontend standby detection banners to inform users during wake-up.

---

## 2. Telecom & Third-Party Gateway Dependencies

1. **Simulated SMS Delivery in Development:**
   - When `FAST2SMS_API_KEY` or `MSG91_AUTH_KEY` is unconfigured, OTP codes are logged to the backend console rather than sent over cellular networks. A production DLT-registered government SMS header is required for production cellular dispatch.
2. **Google Maps & reCAPTCHA Credentials:**
   - When `GOOGLE_MAPS_API_KEY` or `RECAPTCHA_SECRET_KEY` is unconfigured, the platform defaults to Leaflet / OpenStreetMap tiles and bypasses CAPTCHA checks in development mode.

---

## 3. Geographic & Delimitation Boundary Resolution

1. **Digital Ward Polygon Coverage:**
   - While all 38 revenue districts, 25 municipal corporations, and major municipalities are fully represented with official English and Tamil names, digital GeoJSON polygon boundaries are currently delimited for Greater Chennai Corporation (GCC) and Coimbatore City Municipal Corporation (CCMC). Other municipalities fall back to municipal center-point routing pending municipal GIS survey publication.
2. **Rural Panchayat Mapping:**
   - Rural village panchayats fall under the Rural Development & Panchayat Raj Department rather than the Municipal Administration & Water Supply Department. Unsurveyed rural coordinates outside municipal corporation boundaries are marked as `jurisdiction_source="unverified"` rather than fabricating administrative wards.

---

## 4. Concurrency & Scaling Considerations

1. **SQLite Write Concurrency:**
   - SQLite WAL mode allows unlimited concurrent readers alongside a single active writer. For a municipal pilot with < 10,000 daily grievances, SQLite with 64 MB cache and WAL checkpointing provides sub-5ms read latency. For statewide scale (> 100,000 grievances/day), migrating to a managed PostgreSQL cluster with pgvector is recommended.
