#!/bin/bash
if [ -d "/var/www/nextjs" ]; then
    sudo rm -rf /var/www/nextjs/*
else
    sudo mkdir -p /var/www/nextjs
fi