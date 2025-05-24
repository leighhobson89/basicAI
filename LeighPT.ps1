# Ensure script stops on errors
$ErrorActionPreference = "Stop"

# Start expressServer.js
Start-Process "node" -ArgumentList "expressServer.js" -WindowStyle Hidden

# Start basicAI.js
Start-Process "node" -ArgumentList "basicAI.js" -WindowStyle Hidden

# Open browser at localhost:5500
Start-Process "http://localhost:5500/"
