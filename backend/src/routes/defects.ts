import { Router } from 'express';
import prisma from '../prisma/index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Helper to get user's accessible project IDs
async function getUserProjectIds(userId: string, userRole: string): Promise<string[]> {
  if (userRole === 'admin') {
    const projects = await prisma.project.findMany({ select: { id: true } });
    return projects.map(p => p.id);
  }
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true }
  });
  return memberships.map(m => m.projectId);
}

// Helper to check if user has access to a specific project
async function hasProjectAccess(userId: string, userRole: string, projectId: string | null): Promise<boolean> {
  if (!projectId) return false;
  const userProjectIds = await getUserProjectIds(userId, userRole);
  return userProjectIds.includes(projectId);
}

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
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { status, severity, priority, projectId } = req.query;
    const userProjectIds = await getUserProjectIds(req.userId!, req.userRole!);

    const where: any = {
      projectId: { in: userProjectIds }
    };

    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (priority) where.priority = priority;
    if (projectId && userProjectIds.includes(projectId as string)) {
      where.projectId = projectId;
    }

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
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const defect = await prisma.defect.findUnique({
      where: { id: req.params.id }
    });
    if (!defect) {
      return res.status(404).json({ error: 'Defect not found' });
    }
    const userProjectIds = await getUserProjectIds(req.userId!, req.userRole!);
    if (!defect.projectId || !userProjectIds.includes(defect.projectId)) {
      return res.status(403).json({ error: '无权限访问此缺陷' });
    }
    res.json(defect);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch defect' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title, description, severity, priority, status, assignee, foundVersion, fixedVersion, projectId } = req.body;
    if (projectId && req.userRole !== 'admin') {
      const userProjectIds = await getUserProjectIds(req.userId!, req.userRole!);
      if (!userProjectIds.includes(projectId)) {
        return res.status(403).json({ error: '无权限在此项目中创建缺陷' });
      }
    }
    const defect = await prisma.defect.create({
      data: {
        title,
        description,
        severity: severity || 'normal',
        priority: priority || 'medium',
        status: status || 'new',
        assignee,
        foundVersion,
        fixedVersion,
        projectId: projectId || null
      }
    });
    res.status(201).json(defect);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create defect' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title, description, severity, priority, status, assignee, foundVersion, fixedVersion } = req.body;
    const existing = await prisma.defect.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Defect not found' });
    }
    const userProjectIds = await getUserProjectIds(req.userId!, req.userRole!);
    if (!existing.projectId || !userProjectIds.includes(existing.projectId)) {
      return res.status(403).json({ error: '无权限修改此缺陷' });
    }
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

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.defect.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Defect not found' });
    }
    const userProjectIds = await getUserProjectIds(req.userId!, req.userRole!);
    if (!existing.projectId || !userProjectIds.includes(existing.projectId)) {
      return res.status(403).json({ error: '无权限删除此缺陷' });
    }
    await prisma.defect.delete({
      where: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete defect' });
  }
});

export default router;
