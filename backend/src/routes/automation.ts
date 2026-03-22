import { Router } from 'express';
import { spawn } from 'child_process';
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
 * /api/v1/automation:
 *   get:
 *     tags: [自动化测试]
 *     summary: 获取所有自动化测试脚本
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功获取脚本列表
 *   post:
 *     tags: [自动化测试]
 *     summary: 创建自动化测试脚本
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - content
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               scriptType:
 *                 type: string
 *                 default: python
 *               content:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [enabled, disabled]
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { status, projectId } = req.query;
    const userProjectIds = await getUserProjectIds(req.userId!, req.userRole!);

    const where: any = {
      projectId: { in: userProjectIds }
    };
    if (status) where.status = status;
    if (projectId && userProjectIds.includes(projectId as string)) {
      where.projectId = projectId;
    }

    const scripts = await prisma.automationScript.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    res.json(scripts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scripts' });
  }
});

/**
 * @swagger
 * /api/v1/automation/{id}:
 *   get:
 *     tags: [自动化测试]
 *     summary: 获取单个脚本
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
 *     tags: [自动化测试]
 *     summary: 更新脚本
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
 *     tags: [自动化测试]
 *     summary: 删除脚本
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: 删除成功
 *   post:
 *     tags: [自动化测试]
 *     summary: 执行脚本
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 执行成功
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const script = await prisma.automationScript.findUnique({
      where: { id: req.params.id }
    });
    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }
    const userProjectIds = await getUserProjectIds(req.userId!, req.userRole!);
    if (!script.projectId || !userProjectIds.includes(script.projectId)) {
      return res.status(403).json({ error: '无权限访问此脚本' });
    }
    res.json(script);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch script' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description, scriptType, content, status, projectId } = req.body;
    if (projectId && req.userRole !== 'admin') {
      const userProjectIds = await getUserProjectIds(req.userId!, req.userRole!);
      if (!userProjectIds.includes(projectId)) {
        return res.status(403).json({ error: '无权限在此项目中创建脚本' });
      }
    }
    const script = await prisma.automationScript.create({
      data: {
        name,
        description,
        scriptType: scriptType || 'python',
        content,
        status: status || 'enabled',
        projectId: projectId || null
      }
    });
    res.status(201).json(script);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create script' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description, scriptType, content, status, projectId } = req.body;
    const existing = await prisma.automationScript.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Script not found' });
    }
    const userProjectIds = await getUserProjectIds(req.userId!, req.userRole!);
    if (!existing.projectId || !userProjectIds.includes(existing.projectId)) {
      return res.status(403).json({ error: '无权限修改此脚本' });
    }
    const script = await prisma.automationScript.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        scriptType,
        content,
        status,
        projectId: projectId || null
      }
    });
    res.json(script);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update script' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.automationScript.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Script not found' });
    }
    const userProjectIds = await getUserProjectIds(req.userId!, req.userRole!);
    if (!existing.projectId || !userProjectIds.includes(existing.projectId)) {
      return res.status(403).json({ error: '无权限删除此脚本' });
    }
    await prisma.automationScript.delete({
      where: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete script' });
  }
});

router.post('/:id/execute', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const script = await prisma.automationScript.findUnique({
      where: { id: req.params.id }
    });

    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }
    const userProjectIds = await getUserProjectIds(req.userId!, req.userRole!);
    if (!script.projectId || !userProjectIds.includes(script.projectId)) {
      return res.status(403).json({ error: '无权限执行此脚本' });
    }

    const python = spawn('python', ['-c', script.content]);

    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    python.on('close', async (code) => {
      const result = code === 0 ? 'passed' : 'failed';

      await prisma.automationScript.update({
        where: { id: req.params.id },
        data: {
          lastRunAt: new Date(),
          lastResult: result
        }
      });

      res.json({
        scriptId: script.id,
        scriptName: script.name,
        result,
        output: output,
        error: errorOutput,
        exitCode: code
      });
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
