#!/bin/bash

# Kill background processes on exit
trap 'kill $(jobs -p) 2>/dev/null' EXIT

export PYTHONPATH=".:$PYTHONPATH"

echo "========================================="
echo "   FitSense Smart Gym System Launcher   "
echo "========================================="

# 1. Ensure PostgreSQL 14 is running
echo "[1/4] Ensuring PostgreSQL service is active on port 5432..."
brew services start postgresql@14 >/dev/null 2>&1

# 2. Start FastAPI Backend
echo "[2/4] Starting FastAPI Backend on http://localhost:8000..."
cd /Users/jmadhavpai/Desktop/fitSense/backend
./venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload > backend.log 2>&1 &
BACKEND_PID=$!
sleep 2

# 3. Start Member Application
echo "[3/4] Starting Member App on http://localhost:3000..."
cd /Users/jmadhavpai/Desktop/fitSense/frontend/member-app
npm run dev > member_app.log 2>&1 &
MEMBER_PID=$!

# 4. Start Manager Dashboard
echo "[4/4] Starting Manager Dashboard on http://localhost:5174..."
cd /Users/jmadhavpai/Desktop/fitSense/frontend/manager-dashboard
npm run dev > manager_dashboard.log 2>&1 &
MANAGER_PID=$!

echo ""
echo "✅ All FitSense services have been launched!"
echo "   • FastAPI Docs:        http://localhost:8000/docs"
echo "   • Member Application:  http://localhost:3000"
echo "   • Manager Dashboard:   http://localhost:5174"
echo ""
echo "To test simulated treadmill sensor data in another terminal:"
echo "   cd /Users/jmadhavpai/Desktop/fitSense/backend"
echo "   PYTHONPATH=\".:\$PYTHONPATH\" python3 simulator.py --duration 120 --speed-multiplier 2.0"
echo ""
echo "Press Ctrl+C to stop all services."
echo ""

# Wait for background processes
wait
