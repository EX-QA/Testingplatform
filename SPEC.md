# 测试平台规范文档

## 1. 项目概述

- **项目名称**: QAForge - 测试管理平台
- **项目类型**: 前后端分离的Web应用
- **核心功能**: 测试用例管理、测试计划与执行、缺陷管理、接口测试、自动化测试
- **目标用户**: QA工程师、测试团队、开发人员

## 2. 技术架构

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **路由**: React Router v6
- **状态管理**: React Context + Hooks
- **HTTP客户端**: Axios
- **UI组件**: 自定义组件 + CSS Variables
- **图标**: Lucide React

### 后端
- **运行时**: Node.js
- **框架**: Express.js
- **数据库**: SQLite (better-sqlite3)
- **ORM**: Prisma
- **API风格**: RESTful
- **Python执行**: Pyodide (在浏览器中运行Python) 或 Python子进程

### 目录结构
```
Testingplatform/
├── frontend/          # 前端项目
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   └── App.tsx
│   └── package.json
├── backend/           # 后端项目
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── prisma/
│   │   └── index.ts
│   └── package.json
└── SPEC.md
```

## 3. UI/UX 规范

### 3.1 布局结构
- **侧边栏**: 固定左侧，宽240px，深色主题
- **主内容区**: 右侧自适应，白色背景
- **顶部栏**: 固定高度60px，显示页面标题和用户信息

### 3.2 色彩方案
```css
--primary: #2563eb;        /* 主色-蓝色 */
--primary-dark: #1d4ed8;   /* 主色深色 */
--secondary: #64748b;      /* 次要色-灰蓝 */
--success: #22c55e;        /* 成功-绿色 */
--warning: #f59e0b;        /* 警告-橙色 */
--danger: #ef4444;         /* 危险-红色 */
--bg-sidebar: #1e293b;     /* 侧边栏背景 */
--bg-main: #f8fafc;        /* 主背景 */
--bg-card: #ffffff;        /* 卡片背景 */
--text-primary: #1e293b;   /* 主文字 */
--text-secondary: #64748b; /* 次要文字 */
--border: #e2e8f0;         /* 边框 */
```

### 3.3 字体
- **主字体**: "Inter", -apple-system, BlinkMacSystemFont, sans-serif
- **代码字体**: "JetBrains Mono", "Fira Code", monospace

### 3.4 间距系统
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px

### 3.5 响应式断点
- 移动: < 768px
- 平板: 768px - 1024px
- 桌面: > 1024px

## 4. 功能模块规范

### 4.1 测试用例管理 (Test Cases)
**功能列表:**
- 查看测试用例列表（表格视图）
- 创建新测试用例
- 编辑测试用例
- 删除测试用例
- 搜索和筛选用例
- 用例状态管理（草稿/执行中/通过/失败/阻塞）

**用例字段:**
- ID (自动生成)
- 标题 (必填)
- 模块
- 优先级 (高/中/低)
- 类型 (功能/接口/性能/UI)
- 前置条件
- 测试步骤
- 预期结果
- 状态
- 创建时间
- 更新时间

### 4.2 测试计划与执行 (Test Plans)
**功能列表:**
- 查看测试计划列表
- 创建测试计划
- 为计划分配测试用例
- 执行测试计划
- 查看执行结果

**计划字段:**
- ID
- 名称
- 描述
- 状态 (草稿/进行中/已完成)
- 开始日期
- 结束日期
- 关联的测试用例
- 创建时间

**执行记录:**
- 执行ID
- 计划ID
- 执行人
- 执行时间
- 结果 (通过/失败/跳过)
- 备注

### 4.3 缺陷管理 (Defects)
**功能列表:**
- 查看缺陷列表
- 创建缺陷报告
- 编辑缺陷信息
- 缺陷状态流转 (新建/确认/修复中/已解决/关闭/重新打开)
- 关联测试用例

**缺陷字段:**
- ID
- 标题
- 描述
- 严重程度 (致命/严重/一般/轻微)
- 优先级 (高/中/低)
- 状态
- 指派给
- 发现版本
- 修复版本
- 创建时间
- 更新时间

### 4.4 接口测试 (API Testing) - Python
**功能列表:**
- 创建接口测试请求
- 支持的请求方法: GET, POST, PUT, DELETE, PATCH
- 请求头和请求体配置
- 响应查看
- 保存接口测试用例
- 接口测试历史

**技术实现:**
- 使用 Python 的 `requests` 库发送HTTP请求
- 后端通过子进程执行Python脚本
- 返回响应数据给前端

**请求配置:**
- URL
- 方法
- 请求头 (Key-Value)
- 请求体 (JSON/Raw)
- 超时设置

**响应展示:**
- 状态码
- 响应头
- 响应体 (格式化JSON)
- 响应时间

### 4.5 自动化测试 (Automation) - Python
**功能列表:**
- 查看自动化测试脚本列表
- 创建自动化测试脚本
- 编辑脚本内容
- 执行单个脚本
- 查看执行结果

**技术实现:**
- 使用 Python 编写测试脚本
- 支持常见的测试断言
- 后端执行Python脚本并返回结果

**脚本字段:**
- ID
- 名称
- 描述
- 脚本类型 (Python)
- 脚本内容
- 状态 (启用/禁用)
- 上次执行时间
- 上次执行结果

## 5. API 接口设计

### 基础路径: `/api/v1`

### 测试用例
- `GET /test-cases` - 获取用例列表
- `GET /test-cases/:id` - 获取单个用例
- `POST /test-cases` - 创建用例
- `PUT /test-cases/:id` - 更新用例
- `DELETE /test-cases/:id` - 删除用例

### 测试计划
- `GET /test-plans` - 获取计划列表
- `GET /test-plans/:id` - 获取单个计划
- `POST /test-plans` - 创建计划
- `PUT /test-plans/:id` - 更新计划
- `DELETE /test-plans/:id` - 删除计划
- `POST /test-plans/:id/execute` - 执行计划

### 缺陷
- `GET /defects` - 获取缺陷列表
- `GET /defects/:id` - 获取单个缺陷
- `POST /defects` - 创建缺陷
- `PUT /defects/:id` - 更新缺陷
- `DELETE /defects/:id` - 删除缺陷

### 接口测试 (Python requests)
- `POST /api-tests/execute` - 执行Python requests请求
- `GET /api-tests/history` - 获取测试历史
- `POST /api-tests/save` - 保存接口测试

### 自动化测试 (Python)
- `GET /automation/scripts` - 获取脚本列表
- `POST /automation/scripts` - 创建脚本
- `PUT /automation/scripts/:id` - 更新脚本
- `DELETE /automation/scripts/:id` - 删除脚本
- `POST /automation/scripts/:id/execute` - 执行脚本

## 6. 验收标准

### 6.1 通用
- [ ] 前端能够成功启动并显示主界面
- [ ] 后端API能够正常响应
- [ ] 侧边栏导航正常工作
- [ ] 响应式布局在各尺寸下正常显示

### 6.2 测试用例管理
- [ ] 可以创建新用例并保存
- [ ] 用例列表正确显示
- [ ] 可以编辑和删除用例

### 6.3 测试计划
- [ ] 可以创建测试计划
- [ ] 可以为计划添加用例
- [ ] 可以执行计划

### 6.4 缺陷管理
- [ ] 可以创建缺陷报告
- [ ] 缺陷状态可以更新

### 6.5 接口测试 (Python)
- [ ] 可以用Python发送HTTP请求
- [ ] 响应正确显示

### 6.6 自动化测试 (Python)
- [ ] 可以创建Python脚本
- [ ] 可以执行Python脚本
