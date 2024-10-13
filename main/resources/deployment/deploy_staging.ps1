# A script to rebuild the staging code

# Setup directory and branch
cd C:\Users\Administrator\Desktop\staging\ultimatefp
git switch staging

# Check for git updates
git remote update
if (git status -uno | Select-String -Quiet 'Your branch is up to date') {
    Write-Output "Branch up to date."
    Start-Sleep -Seconds 60
    exit
}

Write-Output "Branch is behind. Pulling updates"

# Stop staging services
C:\Users\Administrator\Desktop\nssm.exe stop staging-backend
C:\Users\Administrator\Desktop\nssm.exe stop staging-frontend

# Update the branch
git restore .
git pull

# Copy .env from base prod folder to frontend and backend directories
Copy-Item "C:\Users\Administrator\Desktop\staging\backend.env" -Destination "C:\Users\Administrator\Desktop\staging\ultimatefp\backend\.env"
Copy-Item "C:\Users\Administrator\Desktop\staging\frontend.env" -Destination "C:\Users\Administrator\Desktop\staging\ultimatefp\frontend\.env"

# Restart staging services
C:\Users\Administrator\Desktop\nssm.exe start staging-backend
C:\Users\Administrator\Desktop\nssm.exe start staging-frontend

# Wait 60 Seconds, then exit so that NSSM restarts the status check
Start-Sleep -Seconds 60
exit
