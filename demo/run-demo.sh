#!/bin/bash

echo "🔐 Vault Demo Setup Script"
echo "=========================="
echo

# Check if backend is running
echo "🔍 Checking if Vault backend is running..."
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is not running. Please start it first:"
    echo "   cd ../backend && python main.py"
    exit 1
fi

# Run database seeder
echo
echo "🗄️ Setting up database with demo data..."
cd ../backend
python seed/seed_database.py
cd ../demo

# Install dependencies if needed
echo
echo "📦 Installing demo dependencies..."
npm install

# Start the demo
echo
echo "🚀 Starting Vault Demo on http://localhost:3001"
echo "   - Backend: http://localhost:8000"
echo "   - Frontend: http://localhost:3000"
echo "   - Demo: http://localhost:3001"
echo

npm run dev