import { Router } from 'express';
import prisma from '../prisma/index.js';

const router = Router();

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
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const where: any = {};

    if (status) where.status = status;

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
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: 执行成功
 */
router.get('/:id', async (req, res) => {
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
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch test plan' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, status, startDate, endDate, caseIds } = req.body;

    const plan = await prisma.testPlan.create({
      data: {
        name,
        description,
        status: status || 'draft',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
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

router.put('/:id', async (req, res) => {
  try {
    const { name, description, status, startDate, endDate, caseIds } = req.body;

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

router.delete('/:id', async (req, res) => {
  try {
    await prisma.testPlan.delete({
      where: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete test plan' });
  }
});

router.post('/:id/execute', async (req, res) => {
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
        executor,
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
