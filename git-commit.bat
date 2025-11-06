@echo off
chcp 65001 >nul
echo ========================================
echo Git 快速提交工具
echo ========================================
echo.

:: 检查是否在 Git 仓库中
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误：当前目录不是 Git 仓库！
    pause
    exit /b 1
)

:: 显示当前状态
echo 📊 当前 Git 状态:
echo ----------------------------------------
git status -s
echo ----------------------------------------
echo.

:: 询问是否继续
set /p continue="是否继续提交？(Y/N): "
if /i not "%continue%"=="Y" (
    echo 已取消操作
    pause
    exit /b 0
)

:: 添加所有更改
echo.
echo 📦 添加所有更改到暂存区...
git add .
if errorlevel 1 (
    echo ❌ git add 失败！
    pause
    exit /b 1
)

:: 询问提交信息
echo.
set /p commit_msg="✏️  请输入提交信息: "
if "%commit_msg%"=="" (
    echo ❌ 提交信息不能为空！
    pause
    exit /b 1
)

:: 提交
echo.
echo 💾 正在提交...
git commit -m "%commit_msg%"
if errorlevel 1 (
    echo ❌ git commit 失败！
    pause
    exit /b 1
)

:: 询问是否推送
echo.
set /p push="🚀 是否推送到远程仓库？(Y/N): "
if /i "%push%"=="Y" (
    echo.
    echo 📤 正在推送到远程仓库...
    git push
    if errorlevel 1 (
        echo ❌ git push 失败！
        echo 💡 提示：可能需要先设置上游分支：
        echo    git push --set-upstream origin main
        pause
        exit /b 1
    )
    echo.
    echo ✅ 成功推送到远程仓库！
) else (
    echo.
    echo ✅ 提交成功（未推送）
    echo 💡 如需推送，请运行：git push
)

echo.
echo ========================================
echo 操作完成！
echo ========================================
pause

