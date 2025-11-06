@echo off
chcp 65001 >nul

:: 快速提交脚本
:: 用法: git-quick-commit.bat "提交信息"

if "%~1"=="" (
    echo ❌ 错误：请提供提交信息
    echo.
    echo 用法: git-quick-commit.bat "提交信息"
    echo 示例: git-quick-commit.bat "修复币对参数显示问题"
    pause
    exit /b 1
)

echo 📦 添加所有更改...
git add .

echo 💾 提交中...
git commit -m "%~1"
if errorlevel 1 (
    echo ❌ 提交失败！
    pause
    exit /b 1
)

echo 📤 推送中...
git push
if errorlevel 1 (
    echo ❌ 推送失败！
    echo 💡 提示：可能需要先设置上游分支
    pause
    exit /b 1
)

echo ✅ 完成！
timeout /t 2 >nul

