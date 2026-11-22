# CivicResolve — Administrator User Guide

> **Notice:** This guide is intended for Municipal Commissioners, Zonal Officers, and Platform Administrators operating the CivicResolve backend.

---

## 1. Access & Authentication

- **Login URL:** Access via the **Officer / Admin Portal** link in the navigation header or directly at `/login`.
- **Default Master Administrator:**
  - **Email:** `admin@civicresolve.gov`
  - **Role:** `super_admin`
  - **Password:** `CivicAdmin#2026!Secure` (configured in platform secrets)
- **Session Security:**
  - Admin authentication issues an HttpOnly, SameSite cookie and Bearer JWT token valid for 24 hours.
  - Brute force protection automatically locks out any IP/account target with 5 consecutive failed login attempts for 15 minutes.

---

## 2. Administrator Roles & Permissions (RBAC)

| Role | Scope | Permitted Capabilities |
| :--- | :--- | :--- |
| `super_admin` | Statewide | Full access: View all complaints, assign departments, reallocate officers, download SQLite backups, publish gazettes, inspect audit logs. |
| `district_admin` | District-wide | Oversees all local bodies within assigned district (e.g. Chennai, Coimbatore). Assigns zonal complaints. |
| `municipal_admin`| Local Body / Corporation | Zonal administrative command. Oversees municipal departments, reviews escalated cases, updates SLAs. |
| `department_officer` | Departmental | Manages grievances assigned to specific department (e.g. CMWSSB, TANGEDCO). Assigns field technicians. |
| `field_officer` | Ward / Field | Receives assigned field work orders, files photographic evidence, marks progress. |

---

## 3. Administrative Workflows

### Filtering & Case Management
1. In the **Admin Dashboard**, filter by:
   - **District:** View all 38 revenue districts.
   - **Status:** All, Submitted, Under Review, Assigned, In Progress, Resolved.
   - **Priority:** Critical, High, Medium, Low.
   - **Department:** Filter by municipal wing.
   - **Appealed Only / Overdue Only:** Focus on SLA violations or citizen reopen requests.
2. Click **Manage** on any complaint row to open the **Action & Resolution Center**.

### Assigning Departments & Field Officers
- Select the responsible municipal department from the dropdown.
- Assign a named field engineer or officer.
- Enter internal operational notes (redacted from public view).
- Click **Save Audit Trail & Notify** to record the transition in `audit_logs` and dispatch an event notification to the citizen.

### Escalating Urgent Cases
- In cases of acute hazard or SLA breach, click **Escalate to Supervisor**.
- The priority is auto-adjusted to `Critical` and the workflow status transitions to `Supervisor Review`.

### Publishing Municipal Announcements
- In the **Announcements** tab, click **New Announcement**.
- Enter bilingual title and content (English & Tamil).
- Set priority (`Normal`, `High`, `Emergency`).
- Published gazettes appear immediately on the citizen portal.

### Downloading Database Backups
- `super_admin` accounts have exclusive access to `/api/admin/database/backup`.
- Click **Download Online Backup Snapshot** to trigger a real-time, WAL-checkpointed SQLite backup stream verified with `PRAGMA integrity_check`.
