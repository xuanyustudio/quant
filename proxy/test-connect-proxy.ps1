# Windows PowerShell 测试脚本

$PROXY_URL = "http://localhost:3000"

Write-Host "🧪 测试代理服务器 (CONNECT 模式)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# 测试1: 健康检查
Write-Host "测试 1: 健康检查..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$PROXY_URL/health"
    $response | ConvertTo-Json
} catch {
    Write-Host "  ✗ 失败: $_" -ForegroundColor Red
}
Write-Host ""

# 测试2: URL转发模式
Write-Host "测试 2: URL转发模式..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$PROXY_URL/api/v3/ping"
    Write-Host "  ✓ 成功: $($response | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "  ✗ 失败: $_" -ForegroundColor Red
}
Write-Host ""

# 测试3: HTTP CONNECT 代理模式
Write-Host "测试 3: HTTP CONNECT 代理模式..." -ForegroundColor Yellow
$env:HTTPS_PROXY = $PROXY_URL
try {
    $response = Invoke-RestMethod -Uri "https://api.binance.com/api/v3/ping" -Proxy $PROXY_URL
    Write-Host "  ✓ 成功: $($response | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "  ✗ 失败: $_" -ForegroundColor Red
}
Write-Host ""

# 测试4: 获取服务器时间
Write-Host "测试 4: 通过代理获取币安服务器时间..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://api.binance.com/api/v3/time" -Proxy $PROXY_URL
    $serverTime = [DateTimeOffset]::FromUnixTimeMilliseconds($response.serverTime).LocalDateTime
    Write-Host "  ✓ 服务器时间: $serverTime" -ForegroundColor Green
} catch {
    Write-Host "  ✗ 失败: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ 测试完成！" -ForegroundColor Green
Write-Host ""
Write-Host "如果测试 3 和 4 成功，说明 CONNECT 模式工作正常" -ForegroundColor Cyan
Write-Host ""

