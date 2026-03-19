import { useState, useEffect } from 'react'
import { X, UserPlus, Trash2, Shield, Eye, Edit, Crown } from 'lucide-react'
import { projectsApi, usersApi } from '../services/api'

interface ProjectMember {
  id: string
  userId: string
  projectId: string
  role: string
  user: {
    id: string
    username: string
    email: string
  }
}

interface User {
  id: string
  username: string
  email: string
}

interface ProjectMembersProps {
  projectId: string
  projectName: string
  onClose: () => void
}

export default function ProjectMembers({ projectId, projectName, onClose }: ProjectMembersProps) {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState('viewer')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchMembers()
    fetchAllUsers()
  }, [projectId])

  const fetchMembers = async () => {
    try {
      const res = await projectsApi.getMembers(projectId)
      setMembers(res.data)
    } catch (err) {
      console.error('Failed to fetch members:', err)
      setError('获取成员失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllUsers = async () => {
    try {
      const res = await usersApi.getAll()
      setAllUsers(res.data)
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  const handleAddMember = async () => {
    if (!selectedUserId) {
      setError('请选择用户')
      return
    }
    try {
      await projectsApi.addMember(projectId, { userId: selectedUserId, role: selectedRole })
      setShowAddForm(false)
      setSelectedUserId('')
      setSelectedRole('viewer')
      setError('')
      fetchMembers()
    } catch (err: any) {
      setError(err.response?.data?.error || '添加成员失败')
    }
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await projectsApi.updateMember(projectId, userId, { role: newRole })
      fetchMembers()
    } catch (err: any) {
      setError(err.response?.data?.error || '更新角色失败')
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('确定要移除此成员吗？')) return
    try {
      await projectsApi.removeMember(projectId, userId)
      fetchMembers()
    } catch (err: any) {
      setError(err.response?.data?.error || '移除成员失败')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown size={14} style={{ color: '#f59e0b' }} />
      case 'admin': return <Shield size={14} style={{ color: '#3b82f6' }} />
      case 'editor': return <Edit size={14} style={{ color: '#10b981' }} />
      case 'viewer': return <Eye size={14} style={{ color: '#6b7280' }} />
      default: return null
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return '所有者'
      case 'admin': return '管理员'
      case 'editor': return '编辑者'
      case 'viewer': return '查看者'
      default: return role
    }
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'owner': return 'badge-active'
      case 'admin': return 'badge-draft'
      case 'editor': return 'badge-pending'
      case 'viewer': return 'badge-info'
      default: return 'badge-draft'
    }
  }

  // Get users not already members
  const availableUsers = allUsers.filter(
    u => !members.some(m => m.userId === u.id)
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>项目成员管理</h3>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              项目：{projectName}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {error && (
            <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', marginBottom: '16px', color: '#ef4444', fontSize: '13px' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div className="empty-state">加载中...</div>
          ) : members.length === 0 ? (
            <div className="empty-state">
              <p>暂无成员</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>用户</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>邮箱</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>角色</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getRoleIcon(member.role)}
                        {member.user.username}
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {member.user.email}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      {member.role === 'owner' ? (
                        <span className={`badge ${getRoleBadgeClass(member.role)}`}>
                          {getRoleLabel(member.role)}
                        </span>
                      ) : (
                        <select
                          value={member.role}
                          onChange={e => handleUpdateRole(member.userId, e.target.value)}
                          className="form-select"
                          style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }}
                        >
                          <option value="admin">管理员</option>
                          <option value="editor">编辑者</option>
                          <option value="viewer">查看者</option>
                        </select>
                      )}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                      {member.role !== 'owner' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleRemoveMember(member.userId)}
                          style={{ padding: '4px 8px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {showAddForm ? (
            <div style={{ marginTop: '16px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>添加成员</div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>选择用户</label>
                  <select
                    value={selectedUserId}
                    onChange={e => setSelectedUserId(e.target.value)}
                    className="form-select"
                    style={{ width: '100%' }}
                  >
                    <option value="">请选择用户</option>
                    {availableUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>角色</label>
                  <select
                    value={selectedRole}
                    onChange={e => setSelectedRole(e.target.value)}
                    className="form-select"
                    style={{ width: '100%' }}
                  >
                    <option value="admin">管理员</option>
                    <option value="editor">编辑者</option>
                    <option value="viewer">查看者</option>
                  </select>
                </div>
                <button className="btn btn-primary" onClick={handleAddMember}>添加</button>
                <button className="btn btn-secondary" onClick={() => { setShowAddForm(false); setError(''); }}>取消</button>
              </div>
            </div>
          ) : (
            availableUsers.length > 0 && (
              <button
                className="btn btn-secondary"
                onClick={() => setShowAddForm(true)}
                style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <UserPlus size={16} />
                添加成员
              </button>
            )
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}
