import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     tags: [用户管理]
 *     summary: 获取所有用户
 *     description: 仅admin可访问
 *     responses:
 *       200:
 *         description: 用户列表
 */
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

/**
 * @swagger
 * /api/v1/users/{id}/role:
 *   put:
 *     tags: [用户管理]
 *     summary: 更新用户角色
 *     description: 仅admin可访问
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
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, user]
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/:id/role', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: '无效的角色值' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    res.json(user);
  } catch (error) {
    console.error('更新用户角色失败:', error);
    res.status(500).json({ error: '更新用户角色失败' });
  }
});

export default router;
