$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if ([IO.Path]::GetPathRoot($taskRoot) -ne 'D:\') { throw 'This project requires the verified D: external SSD.' }
$taskDrive = [IO.DriveInfo]::new('D:')
if (-not $taskDrive.IsReady -or $taskDrive.VolumeLabel -ne 'Extreme SSD') { throw 'Expected mounted Extreme SSD at D:.' }
Set-Location -LiteralPath $taskRoot
$taskLocal = Join-Path $taskRoot '.local'
New-Item -ItemType Directory -Path "$taskLocal\temp","$taskLocal\cache\npm","$taskLocal\exports","$taskLocal\browser-profile\Default","$taskLocal\runtime" -Force | Out-Null
$env:TEMP = "$taskLocal\temp"
$env:TMP = $env:TEMP
$env:npm_config_cache = "$taskLocal\cache\npm"
$env:PLAYWRIGHT_BROWSERS_PATH = "$taskLocal\browsers"
$env:SITE_BASE_PATH = "/"
$taskNode = Join-Path $taskLocal 'runtime\node.exe'
if (-not (Test-Path -LiteralPath $taskNode)) {
  $taskBundled = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
  if (Test-Path -LiteralPath $taskBundled) { Copy-Item -LiteralPath $taskBundled -Destination $taskNode }
  else { $taskNode = (Get-Command node -ErrorAction Stop).Source }
}
$taskMajor = [int]((& $taskNode --version).TrimStart('v').Split('.')[0])
if ($taskMajor -lt 24) { throw 'Node.js 24+ is required. Use an existing supported runtime; no global installation is performed.' }
if (-not (Test-Path -LiteralPath (Join-Path $taskRoot 'dist\index.html'))) { throw 'Build missing. Run npm ci and npm run build using Node 24+ and the project scoped cache. See README.' }
$taskState = Join-Path $taskLocal 'running.json'
if (Test-Path -LiteralPath $taskState) {
  $taskPrior = Get-Content -LiteralPath $taskState -Raw | ConvertFrom-Json
  $taskPriorProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($taskPrior.serverPid)" -ErrorAction SilentlyContinue
  if ($taskPriorProcess -and $taskPriorProcess.CommandLine -like "*$taskRoot*serve.mjs*") { Write-Host "Already running: $($taskPrior.url)"; exit 0 }
}
$taskOriginFile = Join-Path $taskLocal 'launcher-origin.json'
$taskPreferredPort = 0
if (Test-Path -LiteralPath $taskOriginFile) {
  try { $taskPreferredPort = [int]((Get-Content -LiteralPath $taskOriginFile -Raw | ConvertFrom-Json).port) } catch { $taskPreferredPort = 0 }
}
if ($taskPreferredPort -lt 1 -or $taskPreferredPort -gt 65535) { $taskPreferredPort = 0 }
$taskListener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,$taskPreferredPort)
try { $taskListener.Start() } catch {
  Write-Host "Previous local port $taskPreferredPort is occupied. Selecting a free port; browser saves belong to the previous origin. Use export/import to move them."
  $taskListener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0)
  $taskListener.Start()
}
$taskPort = $taskListener.LocalEndpoint.Port
$taskListener.Stop()
$taskUrl = "http://127.0.0.1:$taskPort/"
$taskProcess = Start-Process -FilePath $taskNode -ArgumentList @('"' + (Join-Path $taskRoot 'scripts\serve.mjs') + '"',"$taskPort") -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput "$taskLocal\server-output.log" -RedirectStandardError "$taskLocal\server-error.log" -PassThru
Start-Sleep -Milliseconds 1200
if ($taskProcess.HasExited) { Get-Content -LiteralPath "$taskLocal\server-error.log"; throw 'Local server exited. Error log retained in .local.' }
try { $null = Invoke-WebRequest -Uri $taskUrl -UseBasicParsing -TimeoutSec 10 } catch { Get-Content -LiteralPath "$taskLocal\server-error.log"; throw }
@{port=$taskPort;url=$taskUrl} | ConvertTo-Json | Set-Content -LiteralPath $taskOriginFile -Encoding UTF8
$taskProfile = Join-Path $taskLocal 'browser-profile'
$taskPreferences = Join-Path $taskProfile 'Default\Preferences'
if (-not (Test-Path -LiteralPath $taskPreferences)) {
  @{download=@{default_directory=(Join-Path $taskLocal 'exports');prompt_for_download=$false};browser=@{check_default_browser=$false}} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $taskPreferences -Encoding UTF8
}
$taskBrowserPid = $null
$taskBrowser = @((Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),(Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe')) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if ($taskBrowser) {
  $taskBrowserProcess = Start-Process -FilePath $taskBrowser -ArgumentList @('--user-data-dir="'+$taskProfile+'"','--no-first-run','--no-default-browser-check','--disable-breakpad','--disable-crash-reporter','--disable-component-update',$taskUrl) -PassThru
  $taskBrowserPid = $taskBrowserProcess.Id
} else { Write-Host 'No supported installed browser found. Open the URL manually; its saves may be stored outside D:.' }
@{serverPid=$taskProcess.Id;serverStarted=$taskProcess.StartTime.ToUniversalTime().ToString('o');browserPid=$taskBrowserPid;profile=$taskProfile;url=$taskUrl} | ConvertTo-Json | Set-Content -LiteralPath $taskState -Encoding UTF8
Write-Host "Taxwire Account Manager World: $taskUrl"
Write-Host "Browser profile and exports: $taskLocal"
Write-Host 'Use STOP-TAXWIRE-AM-WORLD.cmd to stop only this project. Logs are retained in .local.'
