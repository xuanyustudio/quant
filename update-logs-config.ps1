# 一键更新日志配置到服务器 (Windows PowerShell 版本)

param(
    [Parameter(Mandatory=$true)]
    [string]$Server,
    
    [Parameter(Mandatory=$true)]
    [string]$RemotePath,
    
    [Parameter(Mandatory=$false)]
    [string]$User = "root"
)

Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "📊 日志配置一键更新工具" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

Write-Host "目标服务器: ${User}@${Server}" -ForegroundColor Blue
Write-Host "目标路径: ${RemotePath}" -ForegroundColor Blue
Write-Host ""

# 确认
$confirmation = Read-Host "确认要更新到这个服务器？(y/n)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "已取消" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "步骤1/5: 上传 PM2 配置文件..." -ForegroundColor Yellow
scp ecosystem.config.cjs "${User}@${Server}:${RemotePath}/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 上传失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 完成" -ForegroundColor Green

Write-Host ""
Write-Host "步骤2/5: 上传日志工具脚本..." -ForegroundColor Yellow
scp view-logs.sh "${User}@${Server}:${RemotePath}/"
scp clean-logs.sh "${User}@${Server}:${RemotePath}/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 上传失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 完成" -ForegroundColor Green

Write-Host ""
Write-Host "步骤3/5: 上传 logger.js..." -ForegroundColor Yellow
scp src/utils/logger.js "${User}@${Server}:${RemotePath}/src/utils/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 上传失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 完成" -ForegroundColor Green

Write-Host ""
Write-Host "步骤4/5: 在服务器上设置权限..." -ForegroundColor Yellow
ssh "${User}@${Server}" "cd ${RemotePath} && chmod +x view-logs.sh clean-logs.sh"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 设置权限失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 完成" -ForegroundColor Green

Write-Host ""
Write-Host "步骤5/5: 重启 PM2 应用..." -ForegroundColor Yellow
ssh "${User}@${Server}" "cd ${RemotePath} && pm2 delete stat-arb; pm2 start ecosystem.config.cjs; pm2 save"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 重启失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 完成" -ForegroundColor Green

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "🎉 日志配置更新成功！" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "现在可以查看日志：" -ForegroundColor Blue
Write-Host "  ssh ${User}@${Server}"
Write-Host "  cd ${RemotePath}"
Write-Host "  ./view-logs.sh"
Write-Host ""
Write-Host "或直接查看：" -ForegroundColor Blue
Write-Host "  ssh ${User}@${Server} 'cd ${RemotePath} && pm2 logs stat-arb'"
Write-Host ""

