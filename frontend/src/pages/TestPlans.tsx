import { useState, useEffect } from 'react'
import { Plus, Play, Edit, Trash2, X, Clock } from 'lucide-react'
import { testPlansApi, testCasesApi } from '../services/api'
import ConfirmDialog from '../components/ConfirmDialog'

interface TestCase {
  id: string
  title: string
}

interface PlanItem {
  id: string
  caseId: string
  testCase: TestCase
}

interface TestPlan {
  id: string
  name: string
  description: string | null
  status: string
  startDate: string | null
  endDate: string | null
  items: PlanItem[]
  executions: { id: string; result: string; executedAt: string }[]
  createdAt: string
}

export default function TestPlans() {
  const [plans, setPlans] = useState<TestPlan[]>([])
  const [cases, setCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showExecuteModal, setShowExecuteModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<TestPlan | null>(null)
  const [executingPlan, setExecutingPlan] = useState<TestPlan | null>(null)
  const [executeResult, setExecuteResult] = useState<any>(null)
  const [selectedCases, setSelectedCases] = useState<string[]>([])
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [plansRes, casesRes] = await Promise.all([
        testPlansApi.getAll(),
        testCasesApi.getAll()
      ])
      setPlans(plansRes.data)
      setCases(casesRes.data)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id: string) => {
    setDeletePlanId(id)
  }

  const confirmDeletePlan = async () => {
    if (!deletePlanId) return
    try {
      await testPlansApi.delete(deletePlanId)
      setPlans(plans.filter(p => p.id !== deletePlanId))
      setDeletePlanId(null)
    } catch (error) {
      console.error('Failed to delete plan:', error)
    }
  }

  const handleExecute = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!executingPlan) return
    const formData = new FormData(e.currentTarget)

    try {
      const res = await testPlansApi.execute(executingPlan.id, {
        executor: formData.get('executor') as string,
        notes: formData.get('notes') as string
      })
      setExecuteResult(res.data)
    } catch (error) {
      console.error('Failed to execute plan:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      status: formData.get('status'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      caseIds: selectedCases
    }

    try {
      if (editingPlan) {
        const res = await testPlansApi.update(editingPlan.id, data)
        setPlans(plans.map(p => p.id === editingPlan.id ? res.data : p))
      } else {
        const res = await testPlansApi.create(data)
        setPlans([res.data, ...plans])
      }
      setShowModal(false)
      setEditingPlan(null)
      setSelectedCases([])
    } catch (error) {
      console.error('Failed to save plan:', error)
    }
  }

  const openEditModal = (plan: TestPlan) => {
    setEditingPlan(plan)
    setSelectedCases(plan.items.map(i => i.caseId))
    setShowModal(true)
  }

  const toggleCase = (caseId: string) => {
    setSelectedCases(prev =>
      prev.includes(caseId)
        ? prev.filter(id => id !== caseId)
        : [...prev, caseId]
    )
  }

  return (
    <>
      <header className="page-header">
        <h2>测试计划</h2>
        <button className="btn btn-primary" onClick={() => { setEditingPlan(null); setSelectedCases([]); setShowModal(true) }}>
          <Plus size={18} />新建计划
        </button>
      </header>

      <div className="page-content">
        {loading ? (
          <div className="card">加载中...</div>
        ) : plans.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <Play />
              <p>暂无测试计划</p>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={18} />新建计划
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-2">
            {plans.map(plan => (
              <div key={plan.id} className="card">
                <div className="card-header">
                  <div className="card-title">{plan.name}</div>
                  <span className={`badge badge-${plan.status}`}>
                    {plan.status === 'draft' ? '草稿' : plan.status === 'in_progress' ? '进行中' : '已完成'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px' }}>
                  {plan.description || '暂无描述'}
                </p>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Clock size={14} />
                    <span>包含 {plan.items.length} 个用例</span>
                  </div>
                  {plan.executions?.[0] && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>上次执行: {new Date(plan.executions[0].executedAt).toLocaleString()}</span>
                      <span className={`badge badge-${plan.executions[0].result === 'passed' ? 'passed' : 'failed'}`}>
                        {plan.executions[0].result === 'passed' ? '通过' : plan.executions[0].result === 'partial' ? '部分通过' : '失败'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="actions">
                  <button className="btn btn-primary btn-sm" onClick={() => { setExecutingPlan(plan); setExecuteResult(null); setShowExecuteModal(true) }}>
                    <Play size={14} />执行
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(plan)}>
                    <Edit size={14} />编辑
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(plan.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPlan ? '编辑计划' : '新建计划'}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">名称 *</label>
                  <input name="name" className="form-input" required defaultValue={editingPlan?.name} />
                </div>
                <div className="form-group">
                  <label className="form-label">描述</label>
                  <textarea name="description" className="form-textarea" defaultValue={editingPlan?.description || ''} />
                </div>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">状态</label>
                    <select name="status" className="form-select" defaultValue={editingPlan?.status || 'draft'}>
                      <option value="draft">草稿</option>
                      <option value="in_progress">进行中</option>
                      <option value="completed">已完成</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">开始日期</label>
                    <input type="date" name="startDate" className="form-input" defaultValue={editingPlan?.startDate?.split('T')[0]} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">选择测试用例</label>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px' }}>
                    {cases.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>暂无测试用例</p>
                    ) : (
                      cases.map(c => (
                        <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedCases.includes(c.id)}
                            onChange={() => toggleCase(c.id)}
                          />
                          <span>{c.title}</span>
                        </label>
                      ))
                    )}
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

      {/* Execute Modal */}
      {showExecuteModal && executingPlan && (
        <div className="modal-overlay" onClick={() => setShowExecuteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>执行计划 - {executingPlan.name}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowExecuteModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleExecute}>
              <div className="modal-body">
                {!executeResult ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">执行人</label>
                      <input name="executor" className="form-input" placeholder="请输入执行人姓名" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">备注</label>
                      <textarea name="notes" className="form-textarea" placeholder="执行备注" />
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                      该计划包含 {executingPlan.items.length} 个测试用例，执行将模拟运行所有用例。
                    </p>
                  </>
                ) : (
                  <div>
                    <div style={{ marginBottom: '16px' }}>
                      <span className={`badge badge-${executeResult.summary.passed === executeResult.summary.total ? 'passed' : 'failed'}`}>
                        {executeResult.summary.passed === executeResult.summary.total ? '全部通过' : '部分通过'}
                      </span>
                    </div>
                    <div className="grid grid-3" style={{ textAlign: 'center' }}>
                      <div>
                        <div style={{ fontSize: '24px', fontWeight: '600' }}>{executeResult.summary.total}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>总计</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--success)' }}>{executeResult.summary.passed}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>通过</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--danger)' }}>{executeResult.summary.failed}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>失败</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowExecuteModal(false)}>
                  {executeResult ? '关闭' : '取消'}
                </button>
                {!executeResult && (
                  <button type="submit" className="btn btn-primary">
                    <Play size={16} />开始执行
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {deletePlanId && (
        <ConfirmDialog
          open={true}
          title="确认删除"
          message="确定要删除这个测试计划吗？"
          onConfirm={confirmDeletePlan}
          onCancel={() => setDeletePlanId(null)}
          variant="danger"
        />
      )}
    </>
  )
}
