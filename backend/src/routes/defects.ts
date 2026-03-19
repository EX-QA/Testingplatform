import { Router } from 'express';
import prisma from '../prisma/index.js';

const router = Router();

/**
 * @swagger
 * /api/v1/defects:
 *   get:
 *     tags: [缺陷管理]
 *     summary: 获取所有缺陷
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功获取缺陷列表
 *   post:
 *     tags: [缺陷管理]
 *     summary: 创建缺陷
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               severity:
 *                 type: string
 *                 enum: [fatal, critical, normal, minor]
 *               priority:
 *                 type: string
 *                 enum: [high, medium, low]
 *               status:
 *                 type: string
 *                 enum: [new, confirmed, in_progress, resolved, closed, reopened]
 *               assignee:
 *                 type: string
 *               foundVersion:
 *                 type: string
 *               fixedVersion:
 *                 type: string
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.get('/', async (req, res) => {
  try {
    const { status, severity, priority } = req.query;
    const where: any = {};

    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (priority) where.priority = priority;

    const defects = await prisma.defect.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    res.json(defects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch defects' });
  }
});

/**
 * @swagger
 * /api/v1/defects/{id}:
 *   get:
 *     tags: [缺陷管理]
 *     summary: 获取单个缺陷
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功获取
 *   put:
 *     tags: [缺陷管理]
 *     summary: 更新缺陷
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 更新成功
 *   delete:
 *     tags: [缺陷管理]
 *     summary: 删除缺陷
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
    const defect = await prisma.defect.findUnique({
      where: { id: req.params.id }
    });
    if (!defect) {
      return res.status(404).json({ error: 'Defect not found' });
    }
    res.json(defect);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch defect' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, description, severity, priority, status, assignee, foundVersion, fixedVersion } = req.body;
    const defect = await prisma.defect.create({
      data: {
        title,
        description,
        severity: severity || 'normal',
        priority: priority || 'medium',
        status: status || 'new',
        assignee,
        foundVersion,
        fixedVersion
      }
    });
    res.status(201).json(defect);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create defect' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, description, severity, priority, status, assignee, foundVersion, fixedVersion } = req.body;
    const defect = await prisma.defect.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        severity,
        priority,
        status,
        assignee,
        foundVersion,
        fixedVersion
      }
    });
    res.json(defect);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update defect' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.defect.delete({
      where: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete defect' });
  }
});

export default router;
