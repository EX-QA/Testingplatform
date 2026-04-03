@echo off
echo ======================================
echo  TestHub Docker 一键部署脚本
echo ======================================

echo [1/5] 检查 Docker 环境...
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误: Docker 未安装
    exit /b 1
)

docker compose version >nul 2>nul
if %errorlevel% neq 0 (
    where docker-compose >nul 2>nul
    if %errorlevel% neq 0 (
        echo 错误: Docker Compose 未安装
        exit /b 1
    )
)
echo Docker 环境检查通过

echo [2/5] 配置环境变量...
if not exist ".env" (
    if exist "docker\.env.example" (
        copy docker\.env.example .env
        echo 已创建 .env 文件
        echo 请编辑 .env 设置密码后重新运行
        notepad .env
        exit /b 0
    ) else (
        echo 错误: 找不到 docker/.env.example
        exit /b 1
    )
)
echo 环境变量配置完成

echo [3/5] 构建 Docker 镜像...
docker-compose build
if %errorlevel% neq 0 (
    echo 镜像构建失败
    exit /b 1
)
echo 镜像构建完成

echo [4/5] 启动服务...
docker-compose up -d
if %errorlevel% neq 0 (
    echo 服务启动失败
    exit /b 1
)
echo 服务启动完成

echo [5/5] 检查服务状态...
timeout /t 3 /nobreak >nul
docker-compose ps

echo.
echo ======================================
echo   部署完成!
echo ======================================
echo 前端:   http://localhost
echo API:    http://localhost/api/v1
echo Swagger: http://localhost/api-docs
echo.
echo 查看日志: docker-compose logs -f
echo 停止服务: docker-compose down
echo ======================================
pause
