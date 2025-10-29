@echo off
REM 查询交易对流动性信息
REM 使用方法: query-pair.bat <代理端口> <币对1> <币对2>
REM 例如: query-pair.bat 7890 ID/USDT HOOK/USDT

if "%1"=="" (
    echo 请指定代理端口号
    echo 使用方法: query-pair.bat 代理端口 币对1 币对2
    echo 例如: query-pair.bat 7890 ID/USDT HOOK/USDT
    echo.
    echo 常见代理端口:
    echo   - Clash for Windows: 7890
    echo   - v2rayN: 10809
    echo   - ClashX: 7891
    exit /b 1
)

set HTTPS_PROXY=http://127.0.0.1:%1
echo 使用代理: %HTTPS_PROXY%
echo.

node check-pair-info.js %2 %3

