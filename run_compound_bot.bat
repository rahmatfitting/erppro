@echo off
title Future Compound Bot - Binance Auto-Compounding Engine
color 0A

echo ========================================================
echo    FUTURE COMPOUND BOT - RUNNER 24/7
echo    Akumulasi Posisi BUY / LONG Terus-Menerus
echo ========================================================
echo.

cd /d "%~dp0"

echo Memeriksa dependensi dan file .env...
if not exist node_modules (
    echo [ERROR] node_modules tidak ditemukan! Jalankan npm install terlebih dahulu.
    pause
    exit /b
)

echo Menjalankan Background Engine Compound Bot...
node cron_compound_bot.js

pause
