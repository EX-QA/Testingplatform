import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// 获取项目成员列表
router.get('/:projectId/members', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const requestingUserId = req.userId!;
    const requestingUserRole = req.userRole!;

    // 检查权限: admin 或者项目成员
    if (requestingUserRole !== 'admin') {
      const membership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: { userId: requestingUserId, projectId }
        }
      });
      if (!membership) {
        return res.status(403).json({ error: '无权限访问此项目' });
      }
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    res.json(members);
  } catch (error) {
    console.error('获取项目成员失败:', error);
    res.status(500).json({ error: '获取项目成员失败' });
  }
});

// 添加成员到项目
router.post('/:projectId/members', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const { userId, role } = req.body;
    const requestingUserId = req.userId!;
    const requestingUserRole = req.userRole!;

    // 检查权限: admin 或者项目 owner/admin
    if (requestingUserRole !== 'admin') {
      const membership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: { userId: requestingUserId, projectId }
        }
      });
      if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
        return res.status(403).json({ error: '无权限添加项目成员' });
      }
    }

    if (!userId) {
      return res.status(400).json({ error: '用户ID是必填项' });
    }

    const validRoles = ['admin', 'editor', 'viewer'];
    const memberRole = validRoles.includes(role) ? role : 'viewer';

    // 检查用户是否存在
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 检查是否已是成员
    const existing = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId } }
    });
    if (existing) {
      return res.status(400).json({ error: '用户已是项目成员' });
    }

    const member = await prisma.projectMember.create({
      data: {
        userId,
        projectId,
        role: memberRole
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    res.status(201).json(member);
  } catch (error) {
    console.error('添加项目成员失败:', error);
    res.status(500).json({ error: '添加项目成员失败' });
  }
});

// 更新成员角色
router.put('/:projectId/members/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId, userId } = req.params;
    const { role } = req.body;
    const requestingUserId = req.userId!;
    const requestingUserRole = req.userRole!;

    // 检查权限: admin 或者项目 owner
    if (requestingUserRole !== 'admin') {
      const membership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: { userId: requestingUserId, projectId }
        }
      });
      if (!membership || membership.role !== 'owner') {
        return res.status(403).json({ error: '无权限更新项目成员角色' });
      }
    }

    const validRoles = ['admin', 'editor', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: '无效的角色值' });
    }

    const member = await prisma.projectMember.update({
      where: {
        userId_projectId: { userId, projectId }
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    res.json(member);
  } catch (error) {
    console.error('更新项目成员失败:', error);
    res.status(500).json({ error: '更新项目成员失败' });
  }
});

// 从项目移除成员
router.delete('/:projectId/members/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId, userId } = req.params;
    const requestingUserId = req.userId!;
    const requestingUserRole = req.userRole!;

    // 检查权限: admin 或者项目 owner
    if (requestingUserRole !== 'admin') {
      const membership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: { userId: requestingUserId, projectId }
        }
      });
      if (!membership || membership.role !== 'owner') {
        return res.status(403).json({ error: '无权限移除项目成员' });
      }
    }

    // 不能移除项目所有者
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (project?.ownerId === userId) {
      return res.status(400).json({ error: '不能移除项目所有者' });
    }

    await prisma.projectMember.delete({
      where: {
        userId_projectId: { userId, projectId }
      }
    });

    res.json({ message: '成员已移除' });
  } catch (error) {
    console.error('移除项目成员失败:', error);
    res.status(500).json({ error: '移除项目成员失败' });
  }
});

export default router;
