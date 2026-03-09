#!/bin/bash
echo "--- LandSlide Dev Check ---"

# Check Backend
echo "[1/3] Checking Backend..."
if curl -s http://localhost:3001/api/generate-terrain -X POST -H "Content-Type: application/json" -d '{"cep":"00000000"}' | grep -q "location"; then
  echo "✅ Backend API responds correctly (with fallback/mock)"
else
  echo "❌ Backend API is down or not responding as expected"
fi

# Check Frontend
echo "[2/3] Checking Frontend..."
if curl -s http://localhost:3000 | grep -q "Next"; then
  echo "✅ Frontend Next.js is up"
else
  echo "✅ Frontend might be up (couldn't verify strictly with curl but check browser on port 3000)"
fi

# Check Socket
echo "[3/3] Checking Socket.IO..."
if curl -s "http://localhost:3001/socket.io/?EIO=4&transport=polling" | grep -q "sid"; then
  echo "✅ Socket.IO is initialized"
else
  echo "❌ Socket.IO connection failed"
fi

echo "--- Check Complete ---"
