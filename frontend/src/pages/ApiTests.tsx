import { useState, useEffect } from 'react'
import { Play, Save, Trash2, X, Clock } from 'lucide-react'
import { apiTestsApi } from '../services/api'
import ConfirmDialog from '../components/ConfirmDialog'

interface ApiTest {
  id: string
  name: string
  url: string
  method: string
  headers: string | null
  body: string | null
  status: string
  createdAt: string
}

interface Response {
  status?: number
  headers?: Record<string, string>
  body?: string
  elapsed_ms?: number
  error?: string
}

export default function ApiTests() {
  const [savedTests, setSavedTests] = useState<ApiTest[]>([])
  const [loading, setLoading] = useState(true)

  // Request state
  const [url, setUrl] = useState('')
  const [method, setMethod] = useState('GET')
  const [headers, setHeaders] = useState('')
  const [body, setBody] = useState('')
  const [response, setResponse] = useState<Response | null>(null)
  const [executing, setExecuting] = useState(false)

  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [deleteTestId, setDeleteTestId] = useState<string | null>(null)

  useEffect(() => {
    fetchSavedTests()
  }, [])

  const fetchSavedTests = async () => {
    try {
      const res = await apiTestsApi.getAll()
      setSavedTests(res.data)
    } catch (error) {
      console.error('Failed to fetch saved tests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExecute = async () => {
    if (!url) return
    setExecuting(true)
    setResponse(null)

    try {
      const res = await apiTestsApi.execute({
        url,
        method,
        headers: headers || undefined,
        body: body || undefined
      })
      setResponse(res.data)
    } catch (error: any) {
      setResponse({ error: error.message || '请求失败' })
    } finally {
      setExecuting(false)
    }
  }

  const handleSave = async () => {
    if (!saveName || !url) return
    try {
      const res = await apiTestsApi.save({
        name: saveName,
        url,
        method,
        headers,
        body
      })
      setSavedTests([res.data, ...savedTests])
      setShowSaveModal(false)
      setSaveName('')
    } catch (error) {
      console.error('Failed to save test:', error)
    }
  }

  const loadTest = (test: ApiTest) => {
    setUrl(test.url)
    setMethod(test.method)
    setHeaders(test.headers || '')
    setBody(test.body || '')
    setResponse(null)
  }

  const handleDelete = (id: string) => {
    setDeleteTestId(id)
  }

  const confirmDeleteTest = async () => {
    if (!deleteTestId) return
    try {
      await apiTestsApi.delete(deleteTestId)
      setSavedTests(savedTests.filter(t => t.id !== deleteTestId))
      setDeleteTestId(null)
    } catch (error) {
      console.error('Failed to delete test:', error)
    }
  }

  const getMethodColor = (m: string) => {
    const colors: Record<string, string> = {
      GET: '#22c55e',
      POST: '#f59e0b',
      PUT: '#3b82f6',
      DELETE: '#ef4444',
      PATCH: '#8b5cf6'
    }
    return colors[m] || '#64748b'
  }

  return (
    <>
      <header className="page-header">
        <h2>接口测试 (Python)</h2>
      </header>

      <div className="page-content">
        <div className="grid" style={{ gridTemplateColumns: '1fr 300px' }}>
          {/* Request Panel */}
          <div>
            <div className="card">
              <div className="card-header">
                <div className="card-title">请求</div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <select
                  value={method}
                  onChange={e => setMethod(e.target.value)}
                  style={{ width: '100px', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', fontWeight: '600', color: getMethodColor(method) }}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
                <input
                  type="text"
                  className="form-input"
                  placeholder="输入请求 URL"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary" onClick={handleExecute} disabled={executing || !url}>
                  <Play size={16} />{executing ? '执行中...' : '发送'}
                </button>
                <button className="btn btn-secondary" onClick={() => setShowSaveModal(true)} disabled={!url}>
                  <Save size={16} />保存
                </button>
              </div>

              <div className="tabs" style={{ marginBottom: '0' }}>
                <div className="tab active">Headers</div>
              </div>

              <div className="form-group" style={{ marginTop: '12px' }}>
                <textarea
                  className="form-textarea"
                  placeholder='{"Content-Type": "application/json"}'
                  value={headers}
                  onChange={e => setHeaders(e.target.value)}
                  style={{ minHeight: '80px', fontFamily: 'monospace', fontSize: '13px' }}
                />
              </div>

              {(method === 'POST' || method === 'PUT' || method === 'PATCH') && (
                <>
                  <div className="tabs" style={{ marginBottom: '0' }}>
                    <div className="tab active">Body</div>
                  </div>
                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <textarea
                      className="form-textarea"
                      placeholder='{"key": "value"}'
                      value={body}
                      onChange={e => setBody(e.target.value)}
                      style={{ minHeight: '120px', fontFamily: 'monospace', fontSize: '13px' }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Response Panel */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">响应</div>
                {response && !response.error && (
                  <div className="response-status">
                    <span style={{ color: response.status && response.status < 400 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                      {response.status}
                    </span>
                    <span className="response-time">
                      <Clock size={14} style={{ marginRight: '4px' }} />
                      {response.elapsed_ms}ms
                    </span>
                  </div>
                )}
              </div>

              {response?.error ? (
                <div style={{ color: 'var(--danger)', padding: '20px', textAlign: 'center' }}>
                  {response.error}
                </div>
              ) : response ? (
                <div className="response-viewer">
                  {response.body && (
                    <pre className="code-block">{formatJson(response.body)}</pre>
                  )}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '40px' }}>
                  <Globe />
                  <p>发送请求后查看响应</p>
                </div>
              )}
            </div>
          </div>

          {/* Saved Tests Panel */}
          <div>
            <div className="card">
              <div className="card-header">
                <div className="card-title">已保存的测试</div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>加载中...</div>
              ) : savedTests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  暂无保存的测试
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {savedTests.map(test => (
                    <div
                      key={test.id}
                      style={{
                        padding: '12px',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => loadTest(test)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 500, fontSize: '14px' }}>{test.name}</span>
                        <span style={{ color: getMethodColor(test.method), fontSize: '12px', fontWeight: 600 }}>{test.method}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {test.url}
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); loadTest(test) }}>
                          <Play size={12} />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(test.id) }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>保存测试</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowSaveModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">测试名称 *</label>
                <input
                  type="text"
                  className="form-input"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder="请输入测试名称"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSaveModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!saveName}>保存</button>
            </div>
          </div>
        </div>
      )}

      {deleteTestId && (
        <ConfirmDialog
          open={true}
          title="确认删除"
          message="确定要删除这个测试吗？"
          onConfirm={confirmDeleteTest}
          onCancel={() => setDeleteTestId(null)}
          variant="danger"
        />
      )}
    </>
  )
}

function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return str
  }
}

function Globe() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}
