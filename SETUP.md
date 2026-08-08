# DigiCoin Backend & Frontend Setup

## Backend Setup

The backend is an Express.js server that provides the upgrade plans API.

### Installation

```bash
cd backend
npm install
```

### Environment Variables

Copy `.env.example` to `.env` (already configured for local development):

```bash
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Running the Backend

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The backend will start on `http://localhost:3001`

### API Endpoints

#### GET `/api/plans`
Fetch all available plans and the user's current plan.

**Query Parameters:**
- `userId` (optional): User ID or referral code

**Response:**
```json
{
  "plans": [
    {
      "id": "novice",
      "name": "Novice Plan",
      "icon": "novice",
      "activation": 750,
      "dailyEarnings": 300,
      "taskWithdrawal": 9000,
      "referralBonus": 400,
      "minimumWithdrawal": 1000
    }
  ],
  "currentPlan": { ... }
}
```

#### POST `/api/upgrade-plan`
Upgrade user to a new plan.

**Request Body:**
```json
{
  "userId": "user-id-or-code",
  "planId": "novice"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Upgraded to Novice Plan",
  "currentPlan": { ... }
}
```

#### GET `/api/user/:userId/plan`
Get a specific user's current plan.

**Response:**
```json
{
  "userId": "user-id",
  "currentPlan": { ... }
}
```

#### GET `/api/health`
Health check endpoint.

---

## Frontend Setup

The frontend is a React app built with Vite.

### Installation

```bash
cd digicoin
npm install
```

### Running the Frontend

**Development mode:**
```bash
npm run dev
```

The frontend will start on `http://localhost:5173` and automatically proxy API calls to the backend.

### API Proxy Configuration

The Vite proxy is configured in `digicoin/vite.config.js` to forward all `/api` requests to the backend:

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true
    }
  }
}
```

---

## Running Both Together

### Option 1: Separate Terminals (Recommended)

**Terminal 1 - Backend:**
```bash
npm run backend:dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### Option 2: From Root Directory

You can also run both from the root:

```bash
# Terminal 1
npm run backend:dev

# Terminal 2
npm run dev
```

---

## Features

### Upgrade Plans Component

The `UpgradePlan` component displays:
- Multiple plan tiers (Novice, Mid, Advanced, Elite)
- Plan details (activation fee, daily earnings, task withdrawal, referral bonus)
- Current active plan indicator
- Ability to upgrade to a new plan

### Plans Available

1. **Novice Plan** - Entry level
   - Activation: ₦750
   - Daily Earnings: ₦300
   - Task Withdrawal: ₦9,000
   - Referral Bonus: ₦400

2. **Mid Plan**
   - Activation: ₦1,500
   - Daily Earnings: ₦600
   - Task Withdrawal: ₦15,000
   - Referral Bonus: ₦800

3. **Advanced Plan**
   - Activation: ₦3,000
   - Daily Earnings: ₦1,200
   - Task Withdrawal: ₦25,000
   - Referral Bonus: ₦1,500

4. **Elite Plan**
   - Activation: ₦5,000
   - Daily Earnings: ₦2,000
   - Task Withdrawal: ₦40,000
   - Referral Bonus: ₦2,500

---

## Future Enhancements

- [ ] Connect to a real database (MongoDB, PostgreSQL, etc.)
- [ ] User authentication
- [ ] Payment processing (Stripe integration)
- [ ] Plan activation and withdrawal history
- [ ] Admin dashboard for managing plans
- [ ] Email notifications on plan upgrades

---

## Troubleshooting

### "Cannot GET /api/plans"
- Make sure the backend is running on port 3001
- Check if CORS is properly configured
- Verify the proxy settings in `vite.config.js`

### "Unexpected token '<'"
- The backend is down or not responding on the correct port
- The frontend is trying to fetch from the wrong URL
- Check browser console for full error details

### Port Already in Use
```bash
# Find process using port 3001
netstat -ano | findstr :3001

# Kill the process (Windows)
taskkill /PID <PID> /F
```

---

## Project Structure

```
digi coin/
├── backend/
│   ├── server.js          # Express server with API endpoints
│   ├── package.json
│   ├── .env               # Environment variables
│   └── .env.example       # Example environment variables
├── digicoin/
│   ├── src/
│   │   ├── App.jsx        # Main app component
│   │   ├── DigiCoinApp.jsx # Main app logic
│   │   ├── UpgradePlan.jsx # Upgrade plan component
│   │   ├── main.jsx
│   │   └── index.css
│   ├── vite.config.js     # Vite config with API proxy
│   ├── package.json
│   └── index.html
├── package.json           # Root package.json
└── README.md
```
