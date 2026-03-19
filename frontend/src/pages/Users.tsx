import { useState, useEffect } from 'react'
import { Users as UsersIcon, Shield, User as UserIcon } from 'lucide-react'
import { usersApi } from '../services/api'

interface User {
  id: string
  username: string
  email: string
  role: string
  createdAt: string
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await usersApi.getAll()
      setUsers(res.data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await usersApi.updateRole(userId, { role: newRole })
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
      setShowRoleModal(false)
      setEditingUser(null)
    } catch (error) {
      console.error('Failed to update role:', error)
    }
  }

  return (
    <>
      <header className="page-header">
        <h2>用户管理</h2>
      </header>

      <div className="page-content">
        <div className="card">
          <div className="card-header">
            <div className="card-title">用户列表</div>
          </div>

          {loading ? (
            <div className="empty-state">加载中...</div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <UsersIcon size={48} />
              <p>暂无用户</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>用户名</th>
                    <th>邮箱</th>
                    <th>角色</th>
                    <th>注册时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <UserIcon size={16} style={{ color: 'var(--text-secondary)' }} />
                          {user.username}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                      <td>
                        <span className={`badge badge-${user.role === 'admin' ? 'active' : 'draft'}`}>
                          {user.role === 'admin' ? (
                            <><Shield size={12} style={{ marginRight: '4px' }} />管理员</>
                          ) : (
                            <><UserIcon size={12} style={{ marginRight: '4px' }} />普通用户</>
                          )}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => { setEditingUser(user); setShowRoleModal(true) }}
                        >
                          修改角色
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Role Change Modal */}
      {showRoleModal && editingUser && (
        <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>修改用户角色</h3>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px' }}>
                当前用户: <strong>{editingUser.username}</strong>
              </p>
              <div className="form-group">
                <label className="form-label">选择角色</label>
                <select
                  id="roleSelect"
                  className="form-select"
                  defaultValue={editingUser.role}
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRoleModal(false)}>
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const select = document.getElementById('roleSelect') as HTMLSelectElement
                  handleRoleChange(editingUser.id, select.value)
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
