# CivicResolve — Local & Production Installation Guide

> **Notice:** CivicResolve is a pilot / demonstration platform for municipal grievance redressal designed for Tamil Nadu urban local bodies. It is not an officially commissioned government portal unless explicitly authorized by relevant municipal authorities.

---

## 1. System Requirements

- **Operating System:** Windows 10/11, Ubuntu 20.04/22.04 LTS, or macOS 12+
- **Node.js:** v18.0.0 or higher (v20+ LTS recommended)
- **Package Manager:** `npm` v9.0.0+
- **Database Engine:** SQLite 3 (bundled with `better-sqlite3` and Node.js `node:sqlite`)
- **Memory:** Minimum 1 GB RAM (2 GB recommended for concurrent requests)
- **Disk Space:** 500 MB for repository, dependencies, and database storage

---

## 2. Quickstart Installation (Local Development)

### Step 1: Clone or Open Repository
```bash
git clone https://github.com/vishwamr08/CivicResolve.git
cd CivicResolve
```

### Step 2: Install Backend Dependencies
```bash
cd server
npm install
```

### Step 3: Install Frontend Dependencies
```bash
cd ../client
npm install
```

### Step 4: Environment Configuration
In the `server` directory, create a `.env` file from `.env.example`:
```bash
cd ../server
cp .env.example .env
```
Ensure standard development variables are present:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=civicresolve_dev_jwt_secret_key_2026
SEED_DEMO_DATA=false
```

### Step 5: Start Development Servers
In Terminal 1 (Backend API):
```bash
cd server
npm start
```
The backend API initializes on `http://localhost:5000`.

In Terminal 2 (Frontend Client):
```bash
cd client
npm run dev
```
The React + Vite frontend starts on `http://localhost:5173`.

---

## 3. Production Build & Deployment

### Step 1: Build Frontend Assets
```bash
cd client
npm run build
```
This compiles optimized production bundles into `client/dist`.

### Step 2: Production Server Execution
Configure the production environment:
```bash
cd ../server
export NODE_ENV=production
export DATA_DIR=/var/data
export PORT=5000
node index.js
```

---

## 4. Verification

Execute the automated test suite to verify platform integrity:
```bash
cd server
node test_phase8_e2e_all_20_workflows.js
```
A clean run verifies all 20 core workflows in under 5 seconds.
