import { Router } from 'express';
import prisma from '../prisma/index.js';

const router = Router();

/**
 * @swagger
 * /api/v1/test-cases:
 *   get:
 *     tags: [测试用例]
 *     summary: 获取所有测试用例
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: 项目ID
 *       - in: query
 *         name: suiteId
 *         schema:
 *           type: string
 *         description: 测试套件ID
 *       - in: query
 *         name: folderId
 *         schema:
 *           type: string
 *         description: 文件夹ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: 用例状态
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: 优先级
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *     responses:
 *       200:
 *         description: 成功获取测试用例列表
 *   post:
 *     tags: [测试用例]
 *     summary: 创建测试用例
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - steps
 *             properties:
 *               title:
 *                 type: string
 *               module:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [high, medium, low]
 *               type:
 *                 type: string
 *                 enum: [functional, api, performance, ui]
 *               precondition:
 *                 type: string
 *               steps:
 *                 type: string
 *               expectedResult:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, executing, passed, failed, blocked]
 *               projectId:
 *                 type: string
 *               suiteId:
 *                 type: string
 *               folderId:
 *                 type: string
 *               creatorId:
 *                 type: string
 *               creatorName:
 *                 type: string
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.get('/', async (req, res) => {
  try {
    const { projectId, suiteId, folderId, status, priority, search } = req.query;
    const where: any = {};

    if (projectId) where.projectId = projectId;
    if (suiteId) where.suiteId = suiteId;
    if (folderId) where.folderId = folderId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { module: { contains: search as string } }
      ];
    }

    const cases = await prisma.testCase.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        suite: { select: { id: true, name: true } },
        folder: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(cases);
  } catch (error) {
    console.error('Failed to fetch test cases:', error);
    res.status(500).json({ error: 'Failed to fetch test cases' });
  }
});

/**
 * @swagger
 * /api/v1/test-cases/{id}:
 *   get:
 *     tags: [测试用例]
 *     summary: 获取单个测试用例
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功获取
 *       404:
 *         description: 用例不存在
 *   put:
 *     tags: [测试用例]
 *     summary: 更新测试用例
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
 *     responses:
 *       200:
 *         description: 更新成功
 *   delete:
 *     tags: [测试用例]
 *     summary: 删除测试用例
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: 删除成功
 */
router.get('/:id', async (req, res) => {
  try {
    const testCase = await prisma.testCase.findUnique({
      where: { id: req.params.id },
      include: {
        project: { select: { id: true, name: true } },
        suite: { select: { id: true, name: true } },
        folder: { select: { id: true, name: true } }
      }
    });
    if (!testCase) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    res.json(testCase);
  } catch (error) {
    console.error('Failed to fetch test case:', error);
    res.status(500).json({ error: 'Failed to fetch test case' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, module, priority, type, precondition, steps, expectedResult, status, projectId, suiteId, folderId, creatorId, creatorName } = req.body;
    const testCase = await prisma.testCase.create({
      data: {
        title,
        module,
        priority: priority || 'medium',
        type: type || 'functional',
        precondition,
        steps,
        expectedResult,
        status: status || 'draft',
        projectId,
        suiteId,
        folderId,
        creatorId,
        creatorName
      }
    });
    res.status(201).json(testCase);
  } catch (error) {
    console.error('Failed to create test case:', error);
    res.status(500).json({ error: 'Failed to create test case' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, module, priority, type, precondition, steps, expectedResult, status } = req.body;
    const testCase = await prisma.testCase.update({
      where: { id: req.params.id },
      data: {
        title,
        module,
        priority,
        type,
        precondition,
        steps,
        expectedResult,
        status
      }
    });
    res.json(testCase);
  } catch (error) {
    console.error('Failed to update test case:', error);
    res.status(500).json({ error: 'Failed to update test case' });
  }
});

// 移动测试用例到指定节点
router.patch('/:id/move', async (req, res) => {
  try {
    const { projectId, suiteId, folderId } = req.body;
    const testCase = await prisma.testCase.update({
      where: { id: req.params.id },
      data: {
        projectId,
        suiteId,
        folderId
      }
    });
    res.json(testCase);
  } catch (error) {
    console.error('Failed to move test case:', error);
    res.status(500).json({ error: 'Failed to move test case' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.testCase.delete({
      where: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete test case:', error);
    res.status(500).json({ error: 'Failed to delete test case' });
  }
});

export default router;
