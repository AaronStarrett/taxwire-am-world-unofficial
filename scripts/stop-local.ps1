$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if ([IO.Path]::GetPathRoot($taskRoot) -ne 'D:\') { throw 'Expected project on D:.' }
$taskState = Join-Path $taskRoot '.local\running.json'
if (-not (Test-Path -LiteralPath $taskState)) { Write-Host 'No tracked project process.'; exit 0 }
$taskSaved = Get-Content -LiteralPath $taskState -Raw | ConvertFrom-Json
$taskServer = Get-CimInstance Win32_Process -Filter "ProcessId=$($taskSaved.serverPid)" -ErrorAction SilentlyContinue
if ($taskServer -and $taskServer.CommandLine -like "*$taskRoot*serve.mjs*") {
  $taskLive = Get-Process -Id $taskSaved.serverPid
  if ($taskLive.StartTime.ToUniversalTime().ToString('o') -eq $taskSaved.serverStarted) { Stop-Process -Id $taskSaved.serverPid }
}
$taskProfile = [IO.Path]::GetFullPath($taskSaved.profile)
if (-not $taskProfile.StartsWith((Join-Path $taskRoot '.local\'),[StringComparison]::OrdinalIgnoreCase)) { throw 'Tracked browser profile is outside this project.' }
Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='msedge.exe'" | Where-Object { $_.CommandLine -like "*--user-data-dir=*$taskProfile*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue }
Remove-Item -LiteralPath $taskState
Write-Host 'Stopped tracked project server and dedicated browser. Saves and logs retained.'
