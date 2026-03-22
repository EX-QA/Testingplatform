import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/v1/folders:
 *   get:
 *     tags: [文件夹]
 *     summary: 获取所有文件夹
 *     parameters:
 *       - in: query
 *         name: suiteId
 *         schema:
 *           type: string
 *         description: 测试套件ID（可选）
 *     responses:
 *       200:
 *         description: 文件夹列表
 */
router.get('/', async (req, res) => {
  try {
    const { suiteId } = req.query;
    const where = suiteId ? { suiteId: String(suiteId) } : {};
    const folders = await prisma.folder.findMany({
      where,
      include: {
        _count: { select: { testCases: true, children: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(folders);
  } catch (error) {
    console.error('获取文件夹失败:', error);
    res.status(500).json({ error: '获取文件夹失败' });
  }
});

/**
 * @swagger
 * /api/v1/folders/{id}:
 *   get:
 *     tags: [文件夹]
 *     summary: 获取单个文件夹
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 文件夹详情
 *       404:
 *         description: 文件夹不存在
 */
router.get('/:id', async (req, res) => {
  try {
    const folder = await prisma.folder.findUnique({
      where: { id: req.params.id },
      include: {
        children: {
          include: {
            _count: { select: { testCases: true } }
          }
        },
        testCases: true,
        parent: true
      }
    });
    if (!folder) {
      return res.status(404).json({ error: '文件夹不存在' });
    }
    res.json(folder);
  } catch (error) {
    console.error('获取文件夹失败:', error);
    res.status(500).json({ error: '获取文件夹失败' });
  }
});

/**
 * @swagger
 * /api/v1/folders:
 *   post:
 *     tags: [文件夹]
 *     summary: 创建文件夹
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - suiteId
 *               - creatorId
 *             properties:
 *               name:
 *                 type: string
 *                 description: 文件夹名称
 *               suiteId:
 *                 type: string
 *                 description: 测试套件ID
 *               parentId:
 *                 type: string
 *                 description: 父文件夹ID
 *               creatorId:
 *                 type: string
 *                 description: 创建者ID
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/', async (req, res) => {
  try {
    const { name, suiteId, parentId, creatorId } = req.body;
    if (!name || !suiteId || !creatorId) {
      return res.status(400).json({ error: '名称、套件ID和创建者ID都是必填项' });
    }
    const folder = await prisma.folder.create({
      data: { name, suiteId, parentId, creatorId }
    });
    res.status(201).json(folder);
  } catch (error) {
    console.error('创建文件夹失败:', error);
    res.status(500).json({ error: '创建文件夹失败' });
  }
});

/**
 * @swagger
 * /api/v1/folders/{id}:
 *   put:
 *     tags: [文件夹]
 *     summary: 更新文件夹
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
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const folder = await prisma.folder.update({
      where: { id: req.params.id },
      data: { name }
    });
    res.json(folder);
  } catch (error) {
    console.error('更新文件夹失败:', error);
    res.status(500).json({ error: '更新文件夹失败' });
  }
});

/**
 * @swagger
 * /api/v1/folders/{id}:
 *   delete:
 *     tags: [文件夹]
 *     summary: 删除文件夹
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
    await prisma.folder.delete({ where: { id: req.params.id } });
    res.json({ message: '文件夹已删除' });
  } catch (error) {
    console.error('删除文件夹失败:', error);
    res.status(500).json({ error: '删除文件夹失败' });
  }
});

export default router;
