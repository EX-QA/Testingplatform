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
 * /api/v1/test-plans:
 *   get:
 *     tags: [测试计划]
 *     summary: 获取所有测试计划
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功获取测试计划列表
 *   post:
 *     tags: [测试计划]
 *     summary: 创建测试计划
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
 *               status:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               caseIds:
 *                 type: array
 *                 items:
 *                   type: string
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

    const plans = await prisma.testPlan.findMany({
      where,
      include: {
        items: {
          include: {
            testCase: true
          }
        },
        executions: {
          orderBy: { executedAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch test plans' });
  }
});

/**
 * @swagger
 * /api/v1/test-plans/{id}:
 *   get:
 *     tags: [测试计划]
 *     summary: 获取单个测试计划
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
 *     tags: [测试计划]
 *     summary: 更新测试计划
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const plan = await prisma.testPlan.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            testCase: true
          }
        },
        executions: {
          orderBy: { executedAt: 'desc' }
        }
      }
    });
    if (!plan) {
      return res.status(404).json({ error: 'Test plan not found' });
    }
    const userProjectIds = await getUserProjectIds(req.userId!, req.userRole!);
    if (!plan.projectId || !userProjectIds.includes(plan.projectId)) {
      return res.status(403).json({ error: '无权限访问此测试计划' });
    }
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch test plan' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description, status, startDate, endDate, caseIds, projectId } = req.body;
    if (projectId && req.userRole !== 'admin') {
      const userProjectIds = await getUserProjectIds(req.userId!, req.userRole!);
      if (!userProjectIds.includes(projectId)) {
        return res.status(403).json({ error: '无权限在此项目中创建测试计划' });
      }
    }
    const plan = await prisma.testPlan.create({
      data: {
        name,
        description,
        status: status || 'draft',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        projectId: projectId || null,
        items: caseIds ? {
          create: caseIds.map((caseId: string) => ({ caseId }))
        } : undefined
      },
      include: {
        items: {
          include: {
            testCase: true
          }
        }
      }
    });
    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create test plan' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description, status, startDate, endDate, caseIds, projectId } = req.body;
    const existing = await prisma.testPlan.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Test plan not found' });
    }
    const userProjectIds = await getUserProjectIds(req.userId!, req.userRole!);
    if (!existing.projectId || !userProjectIds.includes(existing.projectId)) {
      return res.status(403).json({ error: '无权限修改此测试计划' });
    }
    await prisma.planItem.deleteMany({
      where: { planId: req.params.id }
    });

    const plan = await prisma.testPlan.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        status,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        projectId: projectId || null,
        items: caseIds ? {
          create: caseIds.map((caseId: string) => ({ caseId }))
        } : undefined
      },
      include: {
        items: {
          include: {
            testCase: true
          }
        }
      }
    });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update test plan' });
  }
});

/**
 * @swagger
 * /api/v1/test-plans/{id}:
 *   delete:
 *     tags: [测试计划]
 *     summary: 删除测试计划
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: 删除成功
 *       403:
 *         description: 无权限删除此测试计划
 *       404:
 *         description: 测试计划不存在
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.testPlan.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Test plan not found' });
    }
    const userProjectIds = await getUserProjectIds(req.userId!, req.userRole!);
    if (!existing.projectId || !userProjectIds.includes(existing.projectId)) {
      return res.status(403).json({ error: '无权限删除此测试计划' });
    }
    await prisma.testPlan.delete({
      where: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete test plan' });
  }
});

/**
 * @swagger
 * /api/v1/test-plans/{id}/execute:
 *   post:
 *     tags: [测试计划]
 *     summary: 执行测试计划
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               executor:
 *                 type: string
 *                 description: 执行人
 *               notes:
 *                 type: string
 *                 description: 执行备注
 *     responses:
 *       201:
 *         description: 执行成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 execution:
 *                   type: object
 *                 results:
 *                   type: array
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     passed:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *       403:
 *         description: 无权限执行此测试计划
 *       404:
 *         description: 测试计划不存在
 */
router.post('/:id/execute', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { executor, notes } = req.body;

    const plan = await prisma.testPlan.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            testCase: true
          }
        }
      }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Test plan not found' });
    }
    const userProjectIds = await getUserProjectIds(req.userId!, req.userRole!);
    if (!plan.projectId || !userProjectIds.includes(plan.projectId)) {
      return res.status(403).json({ error: '无权限执行此测试计划' });
    }

    const results = plan.items.map(item => ({
      caseId: item.caseId,
      result: Math.random() > 0.3 ? 'passed' : 'failed'
    }));

    const passedCount = results.filter(r => r.result === 'passed').length;
    const resultStatus = passedCount === results.length ? 'passed' :
                         passedCount > 0 ? 'partial' : 'failed';

    const execution = await prisma.planExecution.create({
      data: {
        planId: req.params.id,
        executor: executor || req.username,
        result: resultStatus,
        notes
      }
    });

    res.status(201).json({
      execution,
      results,
      summary: {
        total: results.length,
        passed: passedCount,
        failed: results.length - passedCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute test plan' });
  }
});

export default router;
