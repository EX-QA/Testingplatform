import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/v1/projects:
 *   get:
 *     tags: [项目管理]
 *     summary: 获取所有项目
 *     description: admin可见所有项目，普通用户只可见自己是成员的项目
 *     responses:
 *       200:
 *         description: 项目列表
 */
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.userRole === 'admin') {
      // admin 可见所有项目
      const projects = await prisma.project.findMany({
        include: {
          _count: {
            select: { testSuites: true, testCases: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(projects);
    }

    // 普通用户只可见自己是成员的项目
    const memberships = await prisma.projectMember.findMany({
      where: { userId: req.userId },
      include: {
        project: {
          include: {
            _count: {
              select: { testSuites: true, testCases: true }
            }
          }
        }
      }
    });

    const projects = memberships.map(m => m.project);
    res.json(projects);
  } catch (error) {
    console.error('获取项目失败:', error);
    res.status(500).json({ error: '获取项目失败' });
  }
});

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   get:
 *     tags: [项目管理]
 *     summary: 获取单个项目
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 项目详情
 *       404:
 *         description: 项目不存在
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        testSuites: {
          include: {
            _count: { select: { folders: true, testCases: true } }
          }
        }
      }
    });
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }

    // 检查权限: admin 或者项目成员
    if (req.userRole !== 'admin') {
      const membership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: { userId: req.userId!, projectId: project.id }
        }
      });
      if (!membership) {
        return res.status(403).json({ error: '无权限访问此项目' });
      }
    }

    res.json(project);
  } catch (error) {
    console.error('获取项目失败:', error);
    res.status(500).json({ error: '获取项目失败' });
  }
});

/**
 * @swagger
 * /api/v1/projects:
 *   post:
 *     tags: [项目管理]
 *     summary: 创建项目
 *     description: 仅admin可创建项目，创建者自动成为项目owner
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
 *                 description: 项目名称
 *               description:
 *                 type: string
 *                 description: 项目描述
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: '项目名称是必填项' });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        creatorId: req.userId!,
        ownerId: req.userId!
      }
    });

    // 创建者自动成为项目 owner 成员
    await prisma.projectMember.create({
      data: {
        userId: req.userId!,
        projectId: project.id,
        role: 'owner'
      }
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('创建项目失败:', error);
    res.status(500).json({ error: '创建项目失败' });
  }
});

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   put:
 *     tags: [项目管理]
 *     summary: 更新项目
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
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;
    const { id } = req.params;

    // 检查权限: admin 或者项目 owner/admin
    if (req.userRole !== 'admin') {
      const membership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: { userId: req.userId!, projectId: id }
        }
      });
      if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
        return res.status(403).json({ error: '无权限更新此项目' });
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data: { name, description }
    });
    res.json(project);
  } catch (error) {
    console.error('更新项目失败:', error);
    res.status(500).json({ error: '更新项目失败' });
  }
});

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   delete:
 *     tags: [项目管理]
 *     summary: 删除项目
 *     description: 仅admin可删除项目
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
router.delete('/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: '项目已删除' });
  } catch (error) {
    console.error('删除项目失败:', error);
    res.status(500).json({ error: '删除项目失败' });
  }
});

/**
 * @swagger
 * /api/v1/projects/stats/summary:
 *   get:
 *     tags: [项目管理]
 *     summary: 获取项目统计数据
 *     responses:
 *       200:
 *         description: 统计数据
 */
router.get('/stats/summary', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // Get user's accessible projects
    let userProjectFilter: { id: { in: string[] } } | undefined;
    if (req.userRole !== 'admin') {
      const memberships = await prisma.projectMember.findMany({
        where: { userId: req.userId },
        select: { projectId: true }
      });
      const projectIds = memberships.map(m => m.projectId);
      if (projectIds.length === 0) {
        return res.json({ totalTestCases: 0, projects: [] });
      }
      userProjectFilter = { id: { in: projectIds } };
    }

    const [totalTestCases, projectsWithCounts] = await Promise.all([
      userProjectFilter
        ? prisma.testCase.count({ where: { projectId: { in: userProjectFilter.id.in } } })
        : prisma.testCase.count(),
      prisma.project.findMany({
        where: userProjectFilter,
        select: {
          id: true,
          name: true,
          _count: {
            select: { testCases: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    res.json({
      totalTestCases,
      projects: projectsWithCounts.map(p => ({
        id: p.id,
        name: p.name,
        testCaseCount: p._count.testCases
      }))
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

export default router;
