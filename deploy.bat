@echo off
echo ========================================================
echo Auto Deploy Script for Smart Approval System
echo ========================================================

echo 1. Adding all changes...
git add .

set /p commitMsg="Enter commit message (default: Auto deploy): "
if "%commitMsg%"=="" set commitMsg="Auto deploy"

echo 2. Committing with message: %commitMsg%
git commit -m "%commitMsg%"

echo 3. Pushing to GitHub (origin main)...
git push origin main

echo ========================================================
echo Deployment Complete!
echo Your changes are now on GitHub and will trigger Vercel.
echo ========================================================
pause
