import { Router } from 'express';
import { spawn } from 'child_process';
import prisma from '../prisma/index.js';

const router = Router();

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
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) where.status = status;

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
router.get('/:id', async (req, res) => {
  try {
    const script = await prisma.automationScript.findUnique({
      where: { id: req.params.id }
    });
    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }
    res.json(script);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch script' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, scriptType, content, status } = req.body;
    const script = await prisma.automationScript.create({
      data: {
        name,
        description,
        scriptType: scriptType || 'python',
        content,
        status: status || 'enabled'
      }
    });
    res.status(201).json(script);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create script' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, scriptType, content, status } = req.body;
    const script = await prisma.automationScript.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        scriptType,
        content,
        status
      }
    });
    res.json(script);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update script' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.automationScript.delete({
      where: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete script' });
  }
});

router.post('/:id/execute', async (req, res) => {
  try {
    const script = await prisma.automationScript.findUnique({
      where: { id: req.params.id }
    });

    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
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
      const resultDetails = code === 0 ? output : errorOutput;

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
