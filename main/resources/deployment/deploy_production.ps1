# A script to rebuild the production code - and sort

# Setup directory and branch
cd C:\Users\Administrator\Desktop\production\ultimatefp
git switch main

# Check for git updates
git remote update
if (git status -uno | Select-String -Quiet 'Your branch is up to date') {
    Write-Output "Branch up to date."
    Start-Sleep -Seconds 60
    exit
}

Write-Output "Branch is behind. Pulling updates"

# Ensure fallback services are started
C:\Users\Administrator\Desktop\nssm.exe start fallback-backend
C:\Users\Administrator\Desktop\nssm.exe start fallback-frontend

# Stop production services
C:\Users\Administrator\Desktop\nssm.exe stop prod-backend
C:\Users\Administrator\Desktop\nssm.exe stop prod-frontend

# Update the product main branch
cd C:\Users\Administrator\Desktop\production\ultimatefp
git restore .
git pull

# Copy .env from base prod folder to frontend and backend directories
Copy-Item "C:\Users\Administrator\Desktop\production\backend.env" -Destination "C:\Users\Administrator\Desktop\production\ultimatefp\backend\.env"
Copy-Item "C:\Users\Administrator\Desktop\production\frontend.env" -Destination "C:\Users\Administrator\Desktop\production\ultimatefp\frontend\.env"

# Restart production services
C:\Users\Administrator\Desktop\nssm.exe start prod-backend
C:\Users\Administrator\Desktop\nssm.exe start prod-frontend

Start-Sleep -Seconds 10; # Wait 10 seconds before updating fallback service

# Stop fallback services
C:\Users\Administrator\Desktop\nssm.exe stop fallback-backend
C:\Users\Administrator\Desktop\nssm.exe stop fallback-frontend

# Update fallback main branch
cd C:\Users\Administrator\Desktop\fallback\ultimatefp
git restore .
git pull

# Update fallback environment variables
Copy-Item "C:\Users\Administrator\Desktop\fallback\backend.env" -Destination "C:\Users\Administrator\Desktop\fallback\ultimatefp\backend\.env"
Copy-Item "C:\Users\Administrator\Desktop\fallback\frontend.env" -Destination "C:\Users\Administrator\Desktop\fallback\ultimatefp\frontend\.env"

# Restart fallback services
C:\Users\Administrator\Desktop\nssm.exe start fallback-backend
C:\Users\Administrator\Desktop\nssm.exe start fallback-frontend

# Wait 60 Seconds, then exit so that NSSM restarts the status check
Start-Sleep -Seconds 60
exit
