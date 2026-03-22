import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/v1/test-suites:
 *   get:
 *     tags: [测试套件]
 *     summary: 获取所有测试套件
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: 项目ID（可选）
 *     responses:
 *       200:
 *         description: 测试套件列表
 */
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.query;
    const where = projectId ? { projectId: String(projectId) } : {};
    const testSuites = await prisma.testSuite.findMany({
      where,
      include: {
        _count: { select: { folders: true, testCases: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(testSuites);
  } catch (error) {
    console.error('获取测试套件失败:', error);
    res.status(500).json({ error: '获取测试套件失败' });
  }
});

/**
 * @swagger
 * /api/v1/test-suites/{id}:
 *   get:
 *     tags: [测试套件]
 *     summary: 获取单个测试套件
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 测试套件详情
 *       404:
 *         description: 测试套件不存在
 */
router.get('/:id', async (req, res) => {
  try {
    const testSuite = await prisma.testSuite.findUnique({
      where: { id: req.params.id },
      include: {
        folders: {
          where: { parentId: null },
          include: {
            children: { include: { testCases: true } },
            testCases: true
          }
        },
        testCases: { where: { folderId: null } }
      }
    });
    if (!testSuite) {
      return res.status(404).json({ error: '测试套件不存在' });
    }
    res.json(testSuite);
  } catch (error) {
    console.error('获取测试套件失败:', error);
    res.status(500).json({ error: '获取测试套件失败' });
  }
});

/**
 * @swagger
 * /api/v1/test-suites:
 *   post:
 *     tags: [测试套件]
 *     summary: 创建测试套件
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - projectId
 *               - creatorId
 *             properties:
 *               name:
 *                 type: string
 *                 description: 套件名称
 *               description:
 *                 type: string
 *                 description: 套件描述
 *               projectId:
 *                 type: string
 *                 description: 项目ID
 *               creatorId:
 *                 type: string
 *                 description: 创建者ID
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, projectId, creatorId } = req.body;
    if (!name || !projectId || !creatorId) {
      return res.status(400).json({ error: '名称、项目ID和创建者ID都是必填项' });
    }
    const testSuite = await prisma.testSuite.create({
      data: { name, description, projectId, creatorId }
    });
    res.status(201).json(testSuite);
  } catch (error) {
    console.error('创建测试套件失败:', error);
    res.status(500).json({ error: '创建测试套件失败' });
  }
});

/**
 * @swagger
 * /api/v1/test-suites/{id}:
 *   put:
 *     tags: [测试套件]
 *     summary: 更新测试套件
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    const testSuite = await prisma.testSuite.update({
      where: { id: req.params.id },
      data: { name, description }
    });
    res.json(testSuite);
  } catch (error) {
    console.error('更新测试套件失败:', error);
    res.status(500).json({ error: '更新测试套件失败' });
  }
});

/**
 * @swagger
 * /api/v1/test-suites/{id}:
 *   delete:
 *     tags: [测试套件]
 *     summary: 删除测试套件
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/:id', async (req, res) => {
  try {
    await prisma.testSuite.delete({ where: { id: req.params.id } });
    res.json({ message: '测试套件已删除' });
  } catch (error) {
    console.error('删除测试套件失败:', error);
    res.status(500).json({ error: '删除测试套件失败' });
  }
});

export default router;
