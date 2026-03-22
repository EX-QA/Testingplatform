import { Router } from 'express';
import multer from 'multer';
import prisma from '../prisma/index.js';
import csv from 'csv-parser';
import { Readable } from 'stream';
import iconv from 'iconv-lite';
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
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Detect encoding and decode buffer
function decodeBuffer(buffer: Buffer): string {
  // Strip BOM if present
  let buf = buffer;
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    buf = buffer.slice(3);
  }

  // Check if valid UTF-8
  let isUtf8 = true;
  let i = 0;
  while (i < buf.length) {
    const byte = buf[i];
    if (byte > 127) {
      // Count continuation bytes
      let continuationBytes = 0;
      if ((byte & 0xE0) === 0xC0) {
        continuationBytes = 1;
      } else if ((byte & 0xF0) === 0xE0) {
        continuationBytes = 2;
      } else if ((byte & 0xF8) === 0xF0) {
        continuationBytes = 3;
      } else {
        isUtf8 = false;
        break;
      }

      // Check if enough bytes remain
      if (i + continuationBytes >= buf.length) {
        isUtf8 = false;
        break;
      }

      // Verify continuation bytes
      for (let j = 1; j <= continuationBytes; j++) {
        if ((buf[i + j] & 0xC0) !== 0x80) {
          isUtf8 = false;
          break;
        }
      }
      if (!isUtf8) break;
      i += continuationBytes + 1;
    } else {
      i++;
    }
  }

  // Decode based on detected encoding
  if (isUtf8) {
    return buf.toString('utf-8');
  } else {
    // Assume GBK/GB2312 for Chinese Windows CSV files
    return iconv.decode(buf, 'gbk');
  }
}

/**
 * @swagger
 * /api/v1/test-cases:
 *   get:
 *     tags: [测试用例]
 *     summary: 获取所有测试用例
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: 项目ID
 *       - in: query
 *         name: suiteId
 *         schema:
 *           type: string
 *         description: 测试套件ID
 *       - in: query
 *         name: folderId
 *         schema:
 *           type: string
 *         description: 文件夹ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: 用例状态
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: 优先级
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *     responses:
 *       200:
 *         description: 成功获取测试用例列表
 *   post:
 *     tags: [测试用例]
 *     summary: 创建测试用例
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - steps
 *             properties:
 *               title:
 *                 type: string
 *               module:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [high, medium, low]
 *               type:
 *                 type: string
 *                 enum: [functional, api, performance, ui]
 *               precondition:
 *                 type: string
 *               steps:
 *                 type: string
 *               expectedResult:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, executing, passed, failed, blocked]
 *               projectId:
 *                 type: string
 *               suiteId:
 *                 type: string
 *               folderId:
 *                 type: string
 *               creatorId:
 *                 type: string
 *               creatorName:
 *                 type: string
 *     responses:
 *       201:
 *         description: 创建成功
 */
/**
 * @swagger
 * /api/v1/test-cases/template:
 *   get:
 *     tags: [测试用例]
 *     summary: 下载测试用例 CSV 模板
 *     responses:
 *       200:
 *         description: CSV 模板文件
 */
router.get('/template', (req, res) => {
  const template = [
    '# CSV 模板说明',
    '# 必填字段: title, steps',
    '# 可选字段: module, priority, type, precondition, expectedResult',
    '# priority 可选值: high, medium, low (默认 medium)',
    '# type 可选值: functional, api, performance, ui (默认 functional)',
    '',
    'title,module,priority,type,precondition,steps,expectedResult',
    '示例用例1,登录模块,high,functional,用户已登录,打开首页点击登录按钮,跳转至登录页',
    '示例用例2,用户管理,medium,api,,发送GET请求 /api/users,返回用户列表JSON'
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="test_case_template.csv"');
  res.send(template);
});

/**
 * @swagger
 * /api/v1/test-cases/import:
 *   post:
 *     tags: [测试用例]
 *     summary: 批量导入测试用例（CSV）
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               projectId:
 *                 type: string
 *               suiteId:
 *                 type: string
 *               folderId:
 *                 type: string
 *               creatorId:
 *                 type: string
 *               creatorName:
 *                 type: string
 *     responses:
 *       200:
 *         description: 导入结果
 */
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    const { projectId, suiteId, folderId, creatorId, creatorName } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: '请上传 CSV 文件' });
    }

    const file = req.file;
    const results: any[] = [];
    const errors: { row: number; message: string }[] = [];
    const validCases: any[] = [];

    // Parse CSV - csv-parser handles headers automatically
    await new Promise<void>((resolve, reject) => {
      const stream = csv();

      stream.on('data', (data) => results.push(data));
      stream.on('end', () => resolve());
      stream.on('error', (err) => reject(err));

      const readable = new Readable();
      // Decode buffer with encoding detection
      const decodedContent = decodeBuffer(file.buffer);
      readable.push(decodedContent);
      readable.push(null);
      readable.pipe(stream);
    });

    // Validate and process
    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      const rowNum = i + 2; // +2 because header is row 1, data starts at row 2

      // Required fields
      if (!row.title || !row.title.trim()) {
        errors.push({ row: rowNum, message: '标题不能为空' });
        continue;
      }
      if (!row.steps || !row.steps.trim()) {
        errors.push({ row: rowNum, message: '测试步骤不能为空' });
        continue;
      }

      // Validate priority
      const validPriorities = ['high', 'medium', 'low'];
      const priority = row.priority?.toLowerCase().trim() || 'medium';
      if (!validPriorities.includes(priority)) {
        errors.push({ row: rowNum, message: `优先级无效，使用默认值 medium` });
      }

      // Validate type
      const validTypes = ['functional', 'api', 'performance', 'ui'];
      const type = row.type?.toLowerCase().trim() || 'functional';
      if (!validTypes.includes(type)) {
        errors.push({ row: rowNum, message: `用例类型无效，使用默认值 functional` });
      }

      validCases.push({
        title: row.title.trim(),
        module: row.module?.trim() || null,
        priority: validPriorities.includes(priority) ? priority : 'medium',
        type: validTypes.includes(type) ? type : 'functional',
        precondition: row.precondition?.trim() || null,
        steps: row.steps.trim(),
        expectedResult: row.expectedResult?.trim() || null,
        projectId: projectId || null,
        suiteId: suiteId || null,
        folderId: folderId || null,
        creatorId: creatorId || null,
        creatorName: creatorName || null
      });
    }

    // Batch insert (100 per batch)
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < validCases.length; i += batchSize) {
      const batch = validCases.slice(i, i + batchSize);
      await prisma.testCase.createMany({
        data: batch
      });
      insertedCount += batch.length;
    }

    res.json({
      success: true,
      total: results.length,
      imported: insertedCount,
      failed: errors.length,
      errors: errors.slice(0, 20) // Return max 20 errors
    });
  } catch (error) {
    console.error('Failed to import test cases:', error);
    res.status(500).json({ error: '导入失败: ' + (error as Error).message });
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId, suiteId, folderId, priority, search } = req.query;
    const userProjectIds = await getUserProjectIds(req.userId!, req.userRole!);

    // Filter by accessible projects (admin sees all, users see only their projects)
    const where: any = {
      projectId: { in: userProjectIds }
    };

    if (projectId && userProjectIds.includes(projectId as string)) {
      where.projectId = projectId;
    }
    if (suiteId) where.suiteId = suiteId;
    if (folderId) where.folderId = folderId;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { module: { contains: search as string } }
      ];
    }

    const cases = await prisma.testCase.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        suite: { select: { id: true, name: true } },
        folder: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(cases);
  } catch (error) {
    console.error('Failed to fetch test cases:', error);
    res.status(500).json({ error: 'Failed to fetch test cases' });
  }
});

/**
 * @swagger
 * /api/v1/test-cases/{id}:
 *   get:
 *     tags: [测试用例]
 *     summary: 获取单个测试用例
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功获取
 *       404:
 *         description: 用例不存在
 *   put:
 *     tags: [测试用例]
 *     summary: 更新测试用例
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
 *     responses:
 *       200:
 *         description: 更新成功
 *   delete:
 *     tags: [测试用例]
 *     summary: 删除测试用例
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
    const testCase = await prisma.testCase.findUnique({
      where: { id: req.params.id },
      include: {
        project: { select: { id: true, name: true } },
        suite: { select: { id: true, name: true } },
        folder: { select: { id: true, name: true } }
      }
    });
    if (!testCase) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    // Check project access
    const userProjectIds = await getUserProjectIds(req.userId!, req.userRole!);
    if (!testCase.projectId || !userProjectIds.includes(testCase.projectId)) {
      return res.status(403).json({ error: '无权限访问此测试用例' });
    }
    res.json(testCase);
  } catch (error) {
    console.error('Failed to fetch test case:', error);
    res.status(500).json({ error: 'Failed to fetch test case' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title, module, priority, type, precondition, steps, expectedResult, projectId, suiteId, folderId, creatorId, creatorName } = req.body;
    // Validate project access for non-admin users
    if (projectId && req.userRole !== 'admin') {
      const userProjectIds = await getUserProjectIds(req.userId!, req.userRole!);
      if (!userProjectIds.includes(projectId)) {
        return res.status(403).json({ error: '无权限在此项目中创建测试用例' });
      }
    }
    const testCase = await prisma.testCase.create({
      data: {
        title,
        module,
        priority: priority || 'medium',
        type: type || 'functional',
        precondition,
        steps,
        expectedResult,
        projectId,
        suiteId,
        folderId,
        creatorId: creatorId || req.userId,
        creatorName: creatorName || req.username
      }
    });
    res.status(201).json(testCase);
  } catch (error) {
    console.error('Failed to create test case:', error);
    res.status(500).json({ error: 'Failed to create test case' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title, module, priority, type, precondition, steps, expectedResult } = req.body;
    // Check ownership
    const existing = await prisma.testCase.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    const userProjectIds = await getUserProjectIds(req.userId!, req.userRole!);
    if (!existing.projectId || !userProjectIds.includes(existing.projectId)) {
      return res.status(403).json({ error: '无权限修改此测试用例' });
    }
    const testCase = await prisma.testCase.update({
      where: { id: req.params.id },
      data: {
        title,
        module,
        priority,
        type,
        precondition,
        steps,
        expectedResult
      }
    });
    res.json(testCase);
  } catch (error) {
    console.error('Failed to update test case:', error);
    res.status(500).json({ error: 'Failed to update test case' });
  }
});

/**
 * @swagger
 * /api/v1/test-cases/{id}/move:
 *   patch:
 *     tags: [测试用例]
 *     summary: 移动测试用例
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
 *               projectId:
 *                 type: string
 *                 description: 目标项目ID
 *               suiteId:
 *                 type: string
 *                 description: 目标测试套件ID
 *               folderId:
 *                 type: string
 *                 description: 目标文件夹ID
 *     responses:
 *       200:
 *         description: 移动成功
 */
// 移动测试用例到指定节点
router.patch('/:id/move', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId, suiteId, folderId } = req.body;
    // Check access to target project
    if (projectId && req.userRole !== 'admin') {
      const userProjectIds = await getUserProjectIds(req.userId!, req.userRole!);
      if (!userProjectIds.includes(projectId)) {
        return res.status(403).json({ error: '无权限移动到此项目' });
      }
    }
    const testCase = await prisma.testCase.update({
      where: { id: req.params.id },
      data: {
        projectId,
        suiteId,
        folderId
      }
    });
    res.json(testCase);
  } catch (error) {
    console.error('Failed to move test case:', error);
    res.status(500).json({ error: 'Failed to move test case' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // Check ownership
    const existing = await prisma.testCase.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    const userProjectIds = await getUserProjectIds(req.userId!, req.userRole!);
    if (!existing.projectId || !userProjectIds.includes(existing.projectId)) {
      return res.status(403).json({ error: '无权限删除此测试用例' });
    }
    await prisma.testCase.delete({
      where: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete test case:', error);
    res.status(500).json({ error: 'Failed to delete test case' });
  }
});

/**
 * @swagger
 * /api/v1/test-cases/batch-delete:
 *   post:
 *     tags: [测试用例]
 *     summary: 批量删除测试用例
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 要删除的测试用例ID数组
 *     responses:
 *       200:
 *         description: 删除成功
 *       500:
 *         description: 删除失败
 */
router.post('/batch-delete', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }
    // Verify user has access to all test cases being deleted
    const testCases = await prisma.testCase.findMany({
      where: { id: { in: ids } },
      select: { projectId: true }
    });
    const userProjectIds = await getUserProjectIds(req.userId!, req.userRole!);
    const unauthorized = testCases.filter(tc => tc.projectId && !userProjectIds.includes(tc.projectId));
    if (unauthorized.length > 0 && req.userRole !== 'admin') {
      return res.status(403).json({ error: '无权限删除部分测试用例' });
    }
    const result = await prisma.testCase.deleteMany({
      where: { id: { in: ids } }
    });
    res.json({ success: true, deletedCount: result.count });
  } catch (error) {
    console.error('Failed to batch delete test cases:', error);
    res.status(500).json({ error: 'Failed to batch delete test cases' });
  }
});

export default router;
