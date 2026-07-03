#!/bin/bash

echo "=========================================="
echo "Iniciando Backend + Frontend"
echo "=========================================="
echo ""

# Iniciar Backend em background
echo "Iniciando Backend..."
cd Backend
python app.py &
BACKEND_PID=$!

sleep 2

# Iniciar Frontend
cd ../Frontend
echo "Iniciando Frontend..."
npm run dev

# Cleanup
echo ""
echo "Encerrando Backend..."
kill $BACKEND_PID 2>/dev/null || true

echo "=========================================="
