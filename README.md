# expert-eval-portal-thesis-2
Github Repository for the Thesis Evaluation Portal

## Prerequisites

Ensure you have the following installed:
- **Node.js**
- **MongoDB Community Server**
- **PostgreSQL**

## Environment Configuration
**Important:** For the `.env` file, please message **Prince** directly to obtain the necessary environment variables and configuration.


## Global Deployment (Vercel)
You can access the deployed application here:
**Link:** [https://team-404-expert-portal.vercel.app](https://team-404-expert-portal.vercel.app)

### Test Credentials
Use the following credentials to log in:

- **Expert:** 
  - Username: `expert1`
  - Password: `pass123`

- **Admin:**
  - Username: `admin1`
  - Password: `pass123`

## Local Development Setup

### 1. Initial Setup
Install dependencies:
```powershell
npm install
```

### 2. Database Seeding (Dont do this anymore unless you plan to have a new DB)
Initialize the database and create the default admin account:
```powershell
npm run seed:admin
# Note: Ensure PostgreSQL is running before executing this command.
```

### 3. Running the Application
You can run both the frontend and backend concurrently:
```powershell
npm run dev:all
```

Or run them separately in different terminals:

**Backend:**
```powershell
npm run dev:server
```

**Frontend:**
```powershell
npm run dev
```

If you are getting a login error, run this.
```powershell
$env:NODE_ENV="development"
npm.cmd run dev:all
```

## Verification

### Manual Verification
1. **Login:** Navigate to the Localhost URL (usually http://localhost:5173) or the Vercel link.
2. **Credentials:** Attempt to login with the `expert1` or `admin1` credentials listed above.
3. **Navigation:** Verify that the dashboard loads and navigation works.
