# Windows PowerShell Runner
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   Starting School Management Platform..." -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan

if (-not $env:JAVA_HOME -and (Test-Path "C:\Program Files\Java\jdk-21")) {
    $env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
}

node start.js @args

