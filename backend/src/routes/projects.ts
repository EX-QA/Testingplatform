import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// 获取所有项目 (admin可见所有，普通用户只看有权限的)
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

// 获取单个项目
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

// 创建项目 (admin)
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

// 更新项目
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

// 删除项目 (admin)
router.delete('/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: '项目已删除' });
  } catch (error) {
    console.error('删除项目失败:', error);
    res.status(500).json({ error: '删除项目失败' });
  }
});

// 获取仪表盘统计数据
router.get('/stats/summary', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [totalTestCases, projectsWithCounts] = await Promise.all([
      prisma.testCase.count(),
      prisma.project.findMany({
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
