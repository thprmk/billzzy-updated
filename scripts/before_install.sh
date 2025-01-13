#!/bin/bash
cd /var/www/nextjs
npm install
npm run build
pm2 restart nextjs