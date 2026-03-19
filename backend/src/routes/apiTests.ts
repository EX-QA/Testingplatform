import { Router } from 'express';
import { spawn } from 'child_process';
import prisma from '../prisma/index.js';

const router = Router();

/**
 * @swagger
 * /api/v1/api-tests:
 *   get:
 *     tags: [接口测试]
 *     summary: 获取所有保存的接口测试
 *     responses:
 *       200:
 *         description: 成功获取接口测试列表
 *   post:
 *     tags: [接口测试]
 *     summary: 保存接口测试
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               url:
 *                 type: string
 *               method:
 *                 type: string
 *                 enum: [GET, POST, PUT, DELETE, PATCH]
 *               headers:
 *                 type: string
 *               body:
 *                 type: string
 *     responses:
 *       201:
 *         description: 保存成功
 */
router.get('/', async (req, res) => {
  try {
    const tests = await prisma.apiTest.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch API tests' });
  }
});

/**
 * @swagger
 * /api/v1/api-tests/execute:
 *   post:
 *     tags: [接口测试]
 *     summary: 执行接口测试 (Python)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *               - method
 *             properties:
 *               url:
 *                 type: string
 *               method:
 *                 type: string
 *                 enum: [GET, POST, PUT, DELETE, PATCH]
 *               headers:
 *                 type: string
 *               body:
 *                 type: string
 *     responses:
 *       200:
 *         description: 执行成功
 */
router.post('/execute', async (req, res) => {
  try {
    const { url, method, headers, body } = req.body;

    const pythonScript = `
import requests
import json
import time

try:
    headers_dict = ${headers ? JSON.stringify(JSON.parse(headers)) : '{}'}
    ${body ? `body_data = ${JSON.stringify(JSON.parse(body))}` : ''}

    start_time = time.time()

    ${method === 'GET' ? `response = requests.get('${url}', headers=headers_dict, timeout=30)` : ''}
    ${method === 'POST' ? `response = requests.post('${url}', headers=headers_dict, json=${body ? 'body_data' : 'None'}, timeout=30)` : ''}
    ${method === 'PUT' ? `response = requests.put('${url}', headers=headers_dict, json=${body ? 'body_data' : 'None'}, timeout=30)` : ''}
    ${method === 'DELETE' ? `response = requests.delete('${url}', headers=headers_dict, timeout=30)` : ''}
    ${method === 'PATCH' ? `response = requests.patch('${url}', headers=headers_dict, json=${body ? 'body_data' : 'None'}, timeout=30)` : ''}

    elapsed_time = int((time.time() - start_time) * 1000)

    result = {
        'status': response.status_code,
        'headers': dict(response.headers),
        'body': response.text,
        'elapsed_ms': elapsed_time
    }

    print(json.dumps(result))
except Exception as e:
    print(json.dumps({'error': str(e)}))
`;

    const python = spawn('python', ['-c', pythonScript]);

    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: errorOutput || 'Python execution failed' });
      }

      try {
        const result = JSON.parse(output);
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: 'Failed to parse response' });
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/v1/api-tests/{id}:
 *   put:
 *     tags: [接口测试]
 *     summary: 更新接口测试
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
 *     tags: [接口测试]
 *     summary: 删除接口测试
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
router.put('/:id', async (req, res) => {
  try {
    const { name, url, method, headers, body, status } = req.body;
    const test = await prisma.apiTest.update({
      where: { id: req.params.id },
      data: {
        name,
        url,
        method,
        headers,
        body,
        status
      }
    });
    res.json(test);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update API test' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.apiTest.delete({
      where: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete API test' });
  }
});

/**
 * @swagger
 * /api/v1/api-tests/history:
 *   get:
 *     tags: [接口测试]
 *     summary: 获取接口测试历史
 *     parameters:
 *       - in: query
 *         name: testId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功获取
 */
router.get('/history', async (req, res) => {
  try {
    const { testId } = req.query;
    const where: any = {};
    if (testId) where.testId = testId as string;

    const history = await prisma.apiTestHistory.findMany({
      where,
      orderBy: { executedAt: 'desc' },
      take: 50
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

export default router;
