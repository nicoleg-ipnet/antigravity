$env:PATH = "C:\Users\nicole.guimaraes_ipn\Documents\Antigravitry 01\node-portable\node-v20.11.1-win-x64;" + $env:PATH

# Start backend
Start-Process -FilePath "node" -ArgumentList "index.js" -WorkingDirectory ".\csm-app\server" -PassThru

# Start frontend
Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory ".\csm-app\client" -PassThru

Write-Host "Application is starting..."
Write-Host "Backend running on http://localhost:3001"
Write-Host "Frontend running on http://localhost:5173"
