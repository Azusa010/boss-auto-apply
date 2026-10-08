param(
  [string]$Url = 'https://www.zhipin.com/web/geek/jobs',
  [int]$Port = 9223,
  [string]$UserDataDir = 'C:\Users\Azusama\.boss-chrome\profile',
  [switch]$Headless
)

# 寻找真实 Chrome 路径
$chromeCandidates = @(
  'C:\Program Files\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$chromePath = $chromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chromePath) {
  Write-Error "未找到系统 Google Chrome 浏览器安装路径，请检查 Chrome 是否已正确安装。"
  exit 1
}

$flags = @(
  "--remote-debugging-port=$Port",
  "--user-data-dir=$UserDataDir",
  '--no-first-run',
  '--no-default-browser-check',
  '--hide-crash-restore-bubble',
  '--disable-session-crashed-bubble'
)

if ($Headless) {
  $flags += '--headless'
} else {
  $flags += '--window-size=1280,900'
}

# 组合启动命令并使用 WMI 脱壳启动，避免随父进程结束被收割
$cmd = '"' + $chromePath + '" ' + (($flags + $Url) -join ' ')
Write-Host "🚀 正在通过 WMI 独立拉起 Chrome: $chromePath (调试端口: $Port)..."
$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $cmd }

$ok = $false
foreach ($i in 1..15) {
  try {
    $null = Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 "http://127.0.0.1:$Port/json/version"
    $ok = $true
    break
  } catch {
    Start-Sleep -Seconds 2
  }
}

$alive = $null -ne (Get-Process -Id $r.ProcessId -ErrorAction SilentlyContinue)
Write-Host "✅ Chrome 启动完成: PID=$($r.ProcessId) | CDP端口可用=$ok | 进程存活=$alive"
