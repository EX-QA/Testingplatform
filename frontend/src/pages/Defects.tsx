import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, X } from 'lucide-react'
import { defectsApi } from '../services/api'
import ConfirmDialog from '../components/ConfirmDialog'

interface Defect {
  id: string
  title: string
  description: string | null
  severity: string
  priority: string
  status: string
  assignee: string | null
  foundVersion: string | null
  fixedVersion: string | null
  createdAt: string
  updatedAt: string
}

const statusMap: Record<string, string> = {
  new: '新建',
  confirmed: '已确认',
  in_progress: '修复中',
  resolved: '已解决',
  closed: '已关闭',
  reopened: '重新打开'
}

export default function Defects() {
  const [defects, setDefects] = useState<Defect[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDefect, setEditingDefect] = useState<Defect | null>(null)
  const [search, setSearch] = useState('')
  const [deleteDefectId, setDeleteDefectId] = useState<string | null>(null)

  useEffect(() => {
    fetchDefects()
  }, [])

  const fetchDefects = async () => {
    try {
      const res = await defectsApi.getAll()
      setDefects(res.data)
    } catch (error) {
      console.error('Failed to fetch defects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id: string) => {
    setDeleteDefectId(id)
  }

  const confirmDeleteDefect = async () => {
    if (!deleteDefectId) return
    try {
      await defectsApi.delete(deleteDefectId)
      setDefects(defects.filter(d => d.id !== deleteDefectId))
      setDeleteDefectId(null)
    } catch (error) {
      console.error('Failed to delete defect:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      severity: formData.get('severity'),
      priority: formData.get('priority'),
      status: formData.get('status'),
      assignee: formData.get('assignee'),
      foundVersion: formData.get('foundVersion'),
      fixedVersion: formData.get('fixedVersion')
    }

    try {
      if (editingDefect) {
        const res = await defectsApi.update(editingDefect.id, data)
        setDefects(defects.map(d => d.id === editingDefect.id ? res.data : d))
      } else {
        const res = await defectsApi.create(data)
        setDefects([res.data, ...defects])
      }
      setShowModal(false)
      setEditingDefect(null)
    } catch (error) {
      console.error('Failed to save defect:', error)
    }
  }

  const filteredDefects = defects.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    (d.description && d.description.toLowerCase().includes(search.toLowerCase()))
  )

  const getSeverityBadge = (severity: string) => {
    const map: Record<string, string> = {
      fatal: 'fatal',
      critical: 'critical',
      normal: 'normal',
      minor: 'minor'
    }
    return map[severity] || 'normal'
  }

  return (
    <>
      <header className="page-header">
        <h2>缺陷管理</h2>
        <button className="btn btn-primary" onClick={() => { setEditingDefect(null); setShowModal(true) }}>
          <Plus size={18} />新建缺陷
        </button>
      </header>

      <div className="page-content">
        <div className="card">
          <div style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="搜索缺陷..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>

          {loading ? (
            <div className="empty-state">加载中...</div>
          ) : filteredDefects.length === 0 ? (
            <div className="empty-state">
              <Bug />
              <p>暂无缺陷</p>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={18} />新建缺陷
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>标题</th>
                    <th>严重程度</th>
                    <th>优先级</th>
                    <th>状态</th>
                    <th>指派给</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDefects.map((d) => (
                    <tr key={d.id}>
                      <td>{d.title}</td>
                      <td>
                        <span className={`badge badge-${getSeverityBadge(d.severity)}`}>
                          {d.severity === 'fatal' ? '致命' : d.severity === 'critical' ? '严重' : d.severity === 'normal' ? '一般' : '轻微'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${d.priority}`}>
                          {d.priority === 'high' ? '高' : d.priority === 'medium' ? '中' : '低'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${d.status === 'new' || d.status === 'confirmed' ? 'pending' : d.status === 'resolved' || d.status === 'closed' ? 'passed' : 'active'}`}>
                          {statusMap[d.status] || d.status}
                        </span>
                      </td>
                      <td>{d.assignee || '-'}</td>
                      <td>{new Date(d.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="actions">
                          <button className="btn btn-secondary btn-sm" onClick={() => { setEditingDefect(d); setShowModal(true) }}>
                            <Edit size={14} />
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(d.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingDefect ? '编辑缺陷' : '新建缺陷'}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">标题 *</label>
                  <input name="title" className="form-input" required defaultValue={editingDefect?.title} />
                </div>
                <div className="form-group">
                  <label className="form-label">描述</label>
                  <textarea name="description" className="form-textarea" defaultValue={editingDefect?.description || ''} />
                </div>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">严重程度</label>
                    <select name="severity" className="form-select" defaultValue={editingDefect?.severity || 'normal'}>
                      <option value="fatal">致命</option>
                      <option value="critical">严重</option>
                      <option value="normal">一般</option>
                      <option value="minor">轻微</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">优先级</label>
                    <select name="priority" className="form-select" defaultValue={editingDefect?.priority || 'medium'}>
                      <option value="high">高</option>
                      <option value="medium">中</option>
                      <option value="low">低</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">状态</label>
                    <select name="status" className="form-select" defaultValue={editingDefect?.status || 'new'}>
                      <option value="new">新建</option>
                      <option value="confirmed">已确认</option>
                      <option value="in_progress">修复中</option>
                      <option value="resolved">已解决</option>
                      <option value="closed">已关闭</option>
                      <option value="reopened">重新打开</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">指派给</label>
                    <input name="assignee" className="form-input" defaultValue={editingDefect?.assignee || ''} />
                  </div>
                </div>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">发现版本</label>
                    <input name="foundVersion" className="form-input" defaultValue={editingDefect?.foundVersion || ''} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">修复版本</label>
                    <input name="fixedVersion" className="form-input" defaultValue={editingDefect?.fixedVersion || ''} />
                  </div>
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

      {deleteDefectId && (
        <ConfirmDialog
          open={true}
          title="确认删除"
          message="确定要删除这个缺陷吗？"
          onConfirm={confirmDeleteDefect}
          onCancel={() => setDeleteDefectId(null)}
          variant="danger"
        />
      )}
    </>
  )
}

function Bug() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="8" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}
