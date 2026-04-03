#!/bin/bash
set -e

echo "======================================"
echo " QAForge Docker 一键部署脚本"
echo "======================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查 Docker
check_docker() {
    echo -e "\n${YELLOW}[1/5] 检查 Docker 环境...${NC}"
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}错误: Docker 未安装${NC}"
        exit 1
    fi
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "${RED}错误: Docker Compose 未安装${NC}"
        exit 1
    fi
    echo -e "${GREEN}Docker 环境检查通过${NC}"
}

# 配置环境变量
setup_env() {
    echo -e "\n${YELLOW}[2/5] 配置环境变量...${NC}"
    if [ ! -f ".env" ]; then
        if [ -f "docker/.env.example" ]; then
            cp docker/.env.example .env
            echo -e "${GREEN}已创建 .env 文件，请编辑设置密码:${NC}"
            echo -e "${YELLOW}nano .env${NC}"
            echo -e "${RED}请先修改 .env 中的密码，然后重新运行此脚本${NC}"
            exit 0
        else
            echo -e "${RED}错误: 找不到 docker/.env.example${NC}"
            exit 1
        fi
    fi
    echo -e "${GREEN}环境变量配置完成${NC}"
}

# 构建镜像
build_images() {
    echo -e "\n${YELLOW}[3/5] 构建 Docker 镜像...${NC}"
    docker-compose build
    echo -e "${GREEN}镜像构建完成${NC}"
}

# 启动服务
start_services() {
    echo -e "\n${YELLOW}[4/5] 启动服务...${NC}"
    docker-compose up -d
    echo -e "${GREEN}服务启动完成${NC}"
}

# 检查状态
check_status() {
    echo -e "\n${YELLOW}[5/5] 检查服务状态...${NC}"
    sleep 3
    docker-compose ps

    echo -e "\n${GREEN}======================================"
    echo " 部署完成!"
    echo "======================================"
    echo -e "前端: ${YELLOW}http://localhost${NC}"
    echo -e "API:  ${YELLOW}http://localhost/api/v1${NC}"
    echo -e "Swagger: ${YELLOW}http://localhost/api-docs${NC}"
    echo ""
    echo "查看日志: docker-compose logs -f"
    echo "停止服务: docker-compose down"
    echo "======================================${NC}"
}

# 主流程
main() {
    cd "$(dirname "$0")"
    check_docker
    setup_env
    build_images
    start_services
    check_status
}

main "$@"
