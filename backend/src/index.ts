import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import testCasesRouter from './routes/testCases.js';
import testPlansRouter from './routes/testPlans.js';
import defectsRouter from './routes/defects.js';
import apiTestsRouter from './routes/apiTests.js';
import automationRouter from './routes/automation.js';
import authRouter from './routes/auth.js';
import projectsRouter from './routes/projects.js';
import testSuitesRouter from './routes/testSuites.js';
import foldersRouter from './routes/folders.js';
import usersRouter from './routes/users.js';
import projectMembersRouter from './routes/projectMembers.js';

const app = express();
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Swagger 配置
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'QAForge API',
      version: '1.0.0',
      description: 'QAForge 测试平台 API 文档',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: '开发环境',
      },
    ],
    tags: [
      { name: '认证', description: '用户注册和登录' },
      { name: '项目管理', description: '项目管理' },
      { name: '测试套件', description: '测试套件管理' },
      { name: '文件夹', description: '文件夹管理' },
      { name: '测试用例', description: '测试用例管理' },
      { name: '测试计划', description: '测试计划与执行' },
      { name: '缺陷管理', description: '缺陷管理' },
      { name: '接口测试', description: '接口测试 (Python)' },
      { name: '自动化测试', description: '自动化测试 (Python)' },
      { name: '健康检查', description: '系统健康检查' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'QAForge API 文档',
  apiUrl: `/api/v1`,
}));

// JSON 格式的 Swagger 文档
app.get('/api-docs.json', (req, res) => {
  res.json(swaggerSpec);
});

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/projects', projectsRouter);
app.use('/api/v1/projects', projectMembersRouter);
app.use('/api/v1/test-suites', testSuitesRouter);
app.use('/api/v1/folders', foldersRouter);
app.use('/api/v1/test-cases', testCasesRouter);
app.use('/api/v1/test-plans', testPlansRouter);
app.use('/api/v1/defects', defectsRouter);
app.use('/api/v1/api-tests', apiTestsRouter);
app.use('/api/v1/automation', automationRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database and start server
async function main() {
  try {
    await prisma.$connect();
    console.log('Database connected');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`API 文档: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
