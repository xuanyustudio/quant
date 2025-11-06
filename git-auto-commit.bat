@echo off
chcp 65001 >nul

:: 自动提交脚本（带时间戳）
:: 如果提供参数则使用参数，否则使用默认消息

:: 获取当前日期时间
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set date_str=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%
set time_str=%datetime:~8,2%:%datetime:~10,2%

:: 构造提交信息
if "%~1"=="" (
    set "commit_msg=自动提交 - %date_str% %time_str%"
) else (
    set "commit_msg=%~1 [%date_str% %time_str%]"
)

echo ========================================
echo Git 自动提交工具
echo ========================================
echo.
echo 📊 当前状态:
git status -s
echo.
echo 💾 提交信息: %commit_msg%
echo.

echo 📦 添加所有更改...
git add .

echo 💾 提交中...
git commit -m "%commit_msg%"
if errorlevel 1 (
    echo ❌ 提交失败！可能没有更改需要提交
    pause
    exit /b 1
)

echo 📤 推送中...
git push
if errorlevel 1 (
    echo ❌ 推送失败！
    pause
    exit /b 1
)

echo.
echo ✅ 成功！已提交并推送到远程仓库
timeout /t 2 >nul

