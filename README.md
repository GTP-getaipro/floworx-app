# Floworx SaaS Application

A secure SaaS application with Node.js backend and React frontend, featuring OAuth 2.0 integration and automated workflow triggers.

## Features

- 🔐 Secure user authentication with JWT tokens
- 🔗 Google OAuth 2.0 integration
- 🔒 Encrypted token storage
- ⚡ Automated n8n workflow triggers
- 📱 Responsive React frontend
- 🛡️ Security-first architecture

## Project Structure

```
floworx-invite/
├── backend/                 # Node.js Express API
│   ├── database/           # Database schema and connection
│   ├── middleware/         # Authentication middleware
│   ├── routes/            # API routes (auth, oauth)
│   ├── scheduler/         # n8n scheduler service
│   ├── utils/             # Encryption utilities
│   └── server.js          # Main server file
├── frontend/               # React application
│   ├── public/            # Static assets
│   └── src/
│       ├── components/    # React components
│       ├── contexts/      # React contexts
│       └── App.js         # Main app component
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- Google Cloud Console project with OAuth 2.0 credentials
- n8n instance (optional, for automation triggers)

### 1. Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE floworx_db;
```

2. Run the database schema:
```bash
psql -d floworx_db -f backend/database/schema.sql
```

### 2. Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure your `.env` file with:
   - Database credentials
   - JWT secret (generate a strong random string)
   - Encryption key (32 characters)
   - Google OAuth credentials
   - n8n webhook URL

### 3. Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (optional):
```bash
REACT_APP_API_URL=http://localhost:5000/api
```

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API and Gmail API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:5000/api/oauth/google/callback`
6. Copy Client ID and Client Secret to your backend `.env` file

## Running the Application

### Development Mode

1. Install all dependencies:
```bash
npm run install-all
```

2. Start both backend and frontend:
```bash
npm run dev
```

Or run them separately:

Backend:
```bash
cd backend && npm run dev
```

Frontend:
```bash
cd frontend && npm start
```

### Production Mode

1. Build frontend:
```bash
npm run build
```

2. Start backend:
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token
- `GET /api/auth/user/status` - Get user connection status

### OAuth
- `GET /api/oauth/google` - Initiate Google OAuth flow
- `GET /api/oauth/google/callback` - Handle OAuth callback
- `DELETE /api/oauth/google` - Disconnect Google account

### Scheduler
- `GET /api/scheduler/status` - Get scheduler status
- `POST /api/scheduler/trigger` - Manually trigger scheduler

## Security Features

- Password hashing with bcrypt (12 salt rounds)
- JWT token authentication with expiration
- AES-256-GCM encryption for OAuth tokens
- CORS protection
- Helmet.js security headers
- Input validation and sanitization
- SQL injection protection with parameterized queries

## Environment Variables

See `backend/.env.example` for all required environment variables.

## Deploying via Git

### Setting up Git Remote

1. Add your Git remote:
```bash
git remote add origin https://github.com/your-username/floworx-app.git
```

2. Push your code:
```bash
git add .
git commit -m "Initial commit"
git push -u origin main
```

### Continuous Integration (CI)

The CI pipeline automatically runs on pushes and pull requests to `main` and `dev` branches.

**What CI runs:**
- Code audit gates (`audit:unused`, `audit:cycles`)
- Vitest acceptance tests
- Jest regression tests (optional, non-blocking)
- Frontend and backend builds
- Artifact upload (`frontend/build`)

**CI will fail on:**
- Unused files detected (unless allowlisted)
- Circular dependencies found
- Vitest test failures

### Manual Deployment

To trigger a manual deployment to Coolify:

1. Go to your GitHub repository
2. Click **Actions** tab
3. Select **Deploy** workflow
4. Click **Run workflow** button
5. Choose the branch and click **Run workflow**

### Repository Secrets

Configure these secrets in **Settings → Secrets and variables → Actions**:

**Required:**
- `COOLIFY_DEPLOY_HOOK` - The Deploy Hook URL from your Coolify application

**Optional (for CI/tests):**
- `SUPABASE_URL` - Your Supabase project URL (if tests require)
- `SUPABASE_SERVICE_KEY` - Your Supabase service key (if tests require)
- `JWT_SECRET` - JWT secret for testing (or use .env.test)

### Creating Pull Requests

1. Create a feature branch:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes and commit:
```bash
git add .
git commit -m "Add your feature"
git push origin feature/your-feature-name
```

3. Create a Pull Request on GitHub
4. CI will automatically run on your PR
5. Once approved and CI passes, merge to `main`
6. Deployment will automatically trigger (if configured)

## License

ISC
