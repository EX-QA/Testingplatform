# Docker 部署指南 - TestHub (QAForge)

## 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 服务器 1GB+ 内存

## 部署步骤

### 1. 服务器准备

```bash
# 更新系统 (Ubuntu/Debian)
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 安装 Docker Compose
sudo apt install docker-compose -y

# 添加当前用户到 docker 组 (无需 sudo 运行 docker)
sudo usermod -aG docker $USER
```

### 2. 上传代码到服务器

```bash
# 方式 A: Git 克隆
git clone <your-repo-url> /opt/testhub
cd /opt/testhub

# 方式 B: SCP 上传
scp -r ./testingplatform user@your-server:/opt/testhub
```

### 3. 配置环境变量

```bash
cd /opt/testhub

# 复制环境变量模板
cp docker/.env.example .env

# 编辑生产环境配置
nano .env
```

**必须修改的配置:**
```env
DB_PASSWORD=your_very_secure_password
JWT_SECRET=another_very_secure_jwt_secret_at_least_32_chars
CORS_ORIGIN=https://your-domain.com  # 生产环境使用 HTTPS 域名
```

### 4. 构建并启动

```bash
# 构建镜像 (首次部署或代码更新后)
docker-compose build

# 启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 5. 初始化数据库

首次启动时，数据库迁移会自动运行。如需手动执行:

```bash
docker-compose exec backend npx prisma migrate deploy
```

### 6. 验证部署

```bash
# 检查容器健康状态
docker-compose ps

# 测试前端
curl http://localhost

# 测试 API
curl http://localhost/api/v1/health

# 查看 Swagger 文档
# 浏览器访问 http://your-domain.com/api-docs
```

## 日常维护

### 查看日志

```bash
# 所有服务日志
docker-compose logs -f

# 指定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 更新部署

```bash
git pull origin main
docker-compose build
docker-compose up -d
```

### 备份数据库

```bash
# 创建备份目录
mkdir -p backups

# 备份
docker-compose exec db pg_dump -U testhub testhub > backups/testhub_$(date +%Y%m%d_%H%M%S).sql
```

### 恢复数据库

```bash
docker-compose exec -T db psql -U testhub testhub < backups/testhub_backup.sql
```

### 停止服务

```bash
docker-compose down
```

### 完全清除 (包括数据)

```bash
docker-compose down -v
```

## 生产环境配置

### 使用 Nginx 反向代理 (可选)

如果需要 HTTPS 和域名，在服务器上安装 Nginx:

```nginx
# /etc/nginx/sites-available/testhub
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### systemd 服务 (服务器重启后自动启动)

```bash
sudo nano /etc/systemd/system/testhub.service
```

```ini
[Unit]
Description=TestHub Docker Compose
Requires=docker-compose.service
After=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/testhub
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable testhub
sudo systemctl start testhub
```

## 故障排查

### 容器启动失败

```bash
# 查看详细日志
docker-compose logs backend

# 进入容器调试
docker-compose exec backend sh
```

### 数据库连接失败

```bash
# 检查数据库是否就绪
docker-compose exec db pg_isready -U testhub

# 检查连接
docker-compose exec backend sh -c 'echo $DATABASE_URL'
```

### 前端资源加载失败

```bash
# 检查 frontend 容器
docker-compose logs frontend

# 检查 nginx 配置
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf
```

## 端口说明

| 端口 | 服务 | 说明 |
|------|------|------|
| 80 | Nginx | HTTP 访问入口 |
| 5432 | PostgreSQL | 数据库 (仅内部访问) |
| 3001 | Backend | API 服务 (仅内部访问) |
