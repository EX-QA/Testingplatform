import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/v1/projects/{projectId}/members:
 *   get:
 *     tags: [项目管理]
 *     summary: 获取项目成员列表
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成员列表
 */
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

/**
 * @swagger
 * /api/v1/projects/{projectId}/members:
 *   post:
 *     tags: [项目管理]
 *     summary: 添加项目成员
 *     parameters:
 *       - in: path
 *         name: projectId
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
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: 用户ID
 *               role:
 *                 type: string
 *                 enum: [admin, editor, viewer]
 *                 default: viewer
 *     responses:
 *       201:
 *         description: 添加成功
 */
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

/**
 * @swagger
 * /api/v1/projects/{projectId}/members/{userId}:
 *   put:
 *     tags: [项目管理]
 *     summary: 更新成员角色
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
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
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, editor, viewer]
 *     responses:
 *       200:
 *         description: 更新成功
 */
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

/**
 * @swagger
 * /api/v1/projects/{projectId}/members/{userId}:
 *   delete:
 *     tags: [项目管理]
 *     summary: 从项目移除成员
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 移除成功
 */
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

/**
 * @swagger
 * /api/v1/projects/{projectId}/members/batch:
 *   post:
 *     tags: [项目管理]
 *     summary: 批量添加项目成员
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: 项目ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - members
 *             properties:
 *               members:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                       description: 用户ID
 *                     role:
 *                       type: string
 *                       enum: [admin, editor, viewer]
 *                       default: viewer
 *     responses:
 *       200:
 *         description: 批量添加结果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 added:
 *                   type: array
 *                   items:
 *                     type: object
 *                 failed:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                       error:
 *                         type: string
 *                 totalAdded:
 *                   type: integer
 *                 totalFailed:
 *                   type: integer
 */
// 批量添加成员
router.post('/:projectId/members/batch', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const { members } = req.body;
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

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: 'members 必须是非空数组' });
    }

    const validRoles = ['admin', 'editor', 'viewer'];
    const added: any[] = [];
    const failed: { userId: string; error: string }[] = [];

    for (const item of members) {
      const { userId, role } = item;

      if (!userId) {
        failed.push({ userId: String(item.userId || ''), error: '用户ID是必填项' });
        continue;
      }

      // 检查用户是否存在
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        failed.push({ userId, error: '用户不存在' });
        continue;
      }

      // 检查是否已是成员
      const existing = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId, projectId } }
      });
      if (existing) {
        failed.push({ userId, error: '用户已是项目成员' });
        continue;
      }

      const memberRole = validRoles.includes(role) ? role : 'viewer';
      try {
        const member = await prisma.projectMember.create({
          data: { userId, projectId, role: memberRole },
          include: {
            user: { select: { id: true, username: true, email: true } }
          }
        });
        added.push(member);
      } catch (err) {
        failed.push({ userId, error: '创建失败' });
      }
    }

    res.json({ added, failed, totalAdded: added.length, totalFailed: failed.length });
  } catch (error) {
    console.error('批量添加项目成员失败:', error);
    res.status(500).json({ error: '批量添加项目成员失败' });
  }
});

export default router;
