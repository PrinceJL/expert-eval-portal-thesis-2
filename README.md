# expert-eval-portal-thesis-2
Github Repository for the Thesis Evaluation Portal

## Prerequisites

Ensure you have the following installed:
- **MongoDB Community Server**
- **PostgreSQL**

## Local Setup and Manual Testing

### 1. Environment Configuration
Check `backend/.env` and ensure the database credentials match your local setup.
- **MongoDB:** `MONGO_URI`
- **PostgreSQL:** `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_DB`

### 2. Database Initialization
Run the initialization utility to create the PostgreSQL database:
```powershell
cd backend
node create_db_util.js
```

### 3. Database Seeding
Sync the schema and create test accounts:
```powershell
# In the backend directory
node seed_admin.js
node seed_user.js
```
**Test Credentials:**
- **Admin:** `admin2` / `pass123` / Group: `TEAM404`
- **Expert:** `expert1` / `pass123` / Group: `TEAM404`

### 4. Running the Application

#### Backend
```powershell
cd backend
npm run dev
```

#### Frontend
```powershell
cd frontend
npm run dev
```

## Verification

### Manual Verification
1. **Login:** Navigate to the frontend URL and attempt to login with the seeded `admin2` or `expert1` credentials.
2. **Navigation:** Verify that the dashboard loads and navigation works.
3. **Messaging (if implemented):** Test sending a message between an Expert and Admin.