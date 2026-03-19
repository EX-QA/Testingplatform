import { useState, useEffect } from 'react'
import { Plus, Play, Edit, Trash2, X, Code } from 'lucide-react'
import { automationApi } from '../services/api'
import ConfirmDialog from '../components/ConfirmDialog'

interface Script {
  id: string
  name: string
  description: string | null
  scriptType: string
  content: string
  status: string
  lastResult: string | null
  lastRunAt: string | null
  createdAt: string
  updatedAt: string
}

export default function Automation() {
  const [scripts, setScripts] = useState<Script[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showResultModal, setShowResultModal] = useState(false)
  const [editingScript, setEditingScript] = useState<Script | null>(null)
  const [executingScript, setExecutingScript] = useState<Script | null>(null)
  const [executeResult, setExecuteResult] = useState<{result?: string, output?: string, error?: string, exitCode?: number} | null>(null)
  const [deleteScriptId, setDeleteScriptId] = useState<string | null>(null)

  useEffect(() => {
    fetchScripts()
  }, [])

  const fetchScripts = async () => {
    try {
      const res = await automationApi.getAll()
      setScripts(res.data)
    } catch (error) {
      console.error('Failed to fetch scripts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id: string) => {
    setDeleteScriptId(id)
  }

  const confirmDeleteScript = async () => {
    if (!deleteScriptId) return
    try {
      await automationApi.delete(deleteScriptId)
      setScripts(scripts.filter(s => s.id !== deleteScriptId))
      setDeleteScriptId(null)
    } catch (error) {
      console.error('Failed to delete script:', error)
    }
  }

  const handleExecute = async (script: Script) => {
    setExecutingScript(script)
    setExecuteResult(null)
    setShowResultModal(true)

    try {
      const res = await automationApi.execute(script.id)
      setExecuteResult(res.data)

      setScripts(prev => prev.map(s =>
        s.id === script.id
          ? { ...s, lastResult: res.data.result, lastRunAt: new Date().toISOString() }
          : s
      ))
    } catch (error: any) {
      setExecuteResult({ error: error.message || '执行失败' })
    } finally {
      setExecutingScript(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      scriptType: 'python',
      content: formData.get('content'),
      status: formData.get('status')
    }

    try {
      if (editingScript) {
        const res = await automationApi.update(editingScript.id, data)
        setScripts(scripts.map(s => s.id === editingScript.id ? res.data : s))
      } else {
        const res = await automationApi.create(data)
        setScripts([res.data, ...scripts])
      }
      setShowModal(false)
      setEditingScript(null)
    } catch (error) {
      console.error('Failed to save script:', error)
    }
  }

  return (
    <>
      <header className="page-header">
        <h2>自动化测试 (Python)</h2>
        <button className="btn btn-primary" onClick={() => { setEditingScript(null); setShowModal(true) }}>
          <Plus size={18} />新建脚本
        </button>
      </header>

      <div className="page-content">
        {loading ? (
          <div className="card">加载中...</div>
        ) : scripts.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <Code />
              <p>暂无自动化测试脚本</p>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={18} />新建脚本
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-2">
            {scripts.map(script => (
              <div key={script.id} className="card">
                <div className="card-header">
                  <div className="card-title">{script.name}</div>
                  <span className={`badge badge-${script.status === 'enabled' ? 'active' : 'draft'}`}>
                    {script.status === 'enabled' ? '启用' : '禁用'}
                  </span>
                </div>

                {script.description && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px' }}>
                    {script.description}
                  </p>
                )}

                <div style={{ backgroundColor: '#1e293b', borderRadius: '6px', padding: '12px', marginBottom: '12px', maxHeight: '150px', overflow: 'auto' }}>
                  <pre style={{ color: '#e2e8f0', fontSize: '12px', fontFamily: 'monospace', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {script.content.slice(0, 300)}{script.content.length > 300 ? '...' : ''}
                  </pre>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <span>Python</span>
                    {script.lastRunAt && (
                      <span>上次运行: {new Date(script.lastRunAt).toLocaleString()}</span>
                    )}
                    {script.lastResult && (
                      <span className={`badge badge-${script.lastResult === 'passed' ? 'passed' : 'failed'}`}>
                        {script.lastResult === 'passed' ? '通过' : '失败'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="actions">
                  <button className="btn btn-primary btn-sm" onClick={() => handleExecute(script)} disabled={script.status !== 'enabled'}>
                    <Play size={14} />执行
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setEditingScript(script); setShowModal(true) }}>
                    <Edit size={14} />编辑
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(script.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingScript ? '编辑脚本' : '新建脚本'}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">名称 *</label>
                    <input name="name" className="form-input" required defaultValue={editingScript?.name} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">状态</label>
                    <select name="status" className="form-select" defaultValue={editingScript?.status || 'enabled'}>
                      <option value="enabled">启用</option>
                      <option value="disabled">禁用</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">描述</label>
                  <textarea name="description" className="form-textarea" defaultValue={editingScript?.description || ''} />
                </div>
                <div className="form-group">
                  <label className="form-label">Python 脚本内容 *</label>
                  <textarea
                    name="content"
                    className="form-textarea"
                    required
                    defaultValue={editingScript?.content || ''}
                    style={{ minHeight: '250px', fontFamily: 'monospace', fontSize: '13px', backgroundColor: '#1e293b', color: '#e2e8f0' }}
                    placeholder={'# Python 自动化测试脚本示例:\nimport requests\n\ndef test_example():\n    result = 1 + 1\n    assert result == 2\n    return "Test passed!"\n\nprint(test_example())'}
                  />
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    提示: 脚本中可以使用 print() 输出结果，使用 assert 进行断言
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResultModal && (
        <div className="modal-overlay" onClick={() => setShowResultModal(false)}>
          <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>执行结果 - {executingScript?.name}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowResultModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {executingScript ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <p>正在执行...</p>
                </div>
              ) : executeResult ? (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <span className={`badge badge-${executeResult.result === 'passed' ? 'passed' : 'failed'}`}>
                      {executeResult.result === 'passed' ? '通过' : '失败'}
                    </span>
                    <span style={{ marginLeft: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                      退出码: {executeResult.exitCode}
                    </span>
                  </div>
                  {executeResult.output && (
                    <div style={{ marginBottom: '16px' }}>
                      <div className="card-title" style={{ marginBottom: '8px' }}>输出:</div>
                      <pre className="code-block">{`${executeResult.output}`}</pre>
                    </div>
                  )}
                  {executeResult.error && (
                    <div>
                      <div className="card-title" style={{ marginBottom: '8px', color: 'var(--danger)' }}>错误:</div>
                      <pre className="code-block" style={{ color: '#fca5a5' }}>{`${executeResult.error}`}</pre>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowResultModal(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {deleteScriptId && (
        <ConfirmDialog
          open={true}
          title="确认删除"
          message="确定要删除这个脚本吗？"
          onConfirm={confirmDeleteScript}
          onCancel={() => setDeleteScriptId(null)}
          variant="danger"
        />
      )}
    </>
  )
}
