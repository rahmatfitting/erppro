@echo off
title Auto Cron Hedge Fund Buy Radar (07:00, 13:00, 20:00 WIB)
echo ================================================================
echo   Menjalankan Cron Job Hedge Fund Buy Radar (Telegram Notifier)
echo   Jadwal Pengiriman: 07:00, 13:00, dan 20:00 WIB
echo ================================================================
node cron_hedgefund_buy.js
pause
