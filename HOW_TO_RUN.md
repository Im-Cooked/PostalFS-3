# How to Run the Postal Management System

This application is split into two servers:
1. **app.js** - Backend REST API server (Port 3000)
2. **axios.js** - Frontend client server (Port 5500)

## Architecture

```
User Browser (http://localhost:5500)
    ↓
axios.js (Frontend Client)
    ↓ HTTP Requests via Axios
app.js (Backend REST API)
    ↓
SQLite Database
```

## Installation

```bash
npm install
```

## Running the Application

### Option 1: Run both servers together (Recommended)

```bash
npm run dev
```

This will start both:
- Backend API on http://localhost:3000
- Frontend Client on http://localhost:5500

**Access the app at: http://localhost:5500**

### Option 2: Run servers separately

**Terminal 1 - Backend API:**
```bash
npm start
# or
npm run backend
# or
node app.js
```

**Terminal 2 - Frontend Client:**
```bash
npm run frontend
# or
node axios.js
```

Then open your browser to **http://localhost:5500**

## Important Notes

1. **Always start the backend (app.js) BEFORE the frontend (axios.js)**
2. The frontend makes HTTP requests to the backend API
3. Access the application through port **5500** (not 3000)
4. Port 3000 is for API only and returns JSON data
5. Port 5500 renders the HTML views

## Testing the API Directly

You can test the backend API directly using:

```bash
# Test API root
curl http://localhost:3000

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

## Default Login

If you have seeded the database:
- Email: `admin@postal.com`
- Password: `admin123`

## Troubleshooting

**Problem:** Frontend shows connection errors
- **Solution:** Make sure the backend (app.js on port 3000) is running first

**Problem:** Port already in use
- **Solution:** Stop any existing Node processes or change the port in the files

**Problem:** Database errors
- **Solution:** Run the database seed: `node Database/seed.js`
