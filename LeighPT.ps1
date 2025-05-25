# Ensure script stops on errors
$ErrorActionPreference = "Stop"

# Start expressServer.js (visible window)
Start-Process "node" -ArgumentList "expressServer.js"

# Start basicAI.js (hidden window)
Start-Process "node" -ArgumentList "basicAI.js" -WindowStyle Hidden

# Open browser at localhost:5500
Start-Process "http://localhost:5500/"


