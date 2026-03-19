import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, Zap, GitBranch, BarChart3 } from 'lucide-react'
import api from '../services/api'
import '../auth.css'

function Register() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('两次密码输入不一致')
      return
    }

    if (password.length < 6) {
      setError('密码至少需要 6 位')
      return
    }

    setLoading(true)

    try {
      await api.post('/auth/register', { username, email, password })
      navigate('/login')
    } catch (err: any) {
      setError(err.response?.data?.error || '注册失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-form-side">
        <div className="auth-card">
          <div className="auth-header">
            <h1>注册</h1>
            <p>创建新账号，加入 QAForge</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="username">用户名</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">邮箱</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">密码</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">确认密码</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入密码"
                required
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? '注册中...' : '注 册'}
            </button>
          </form>

          <div className="auth-footer">
            <p>已有账号？ <Link to="/login">去登录</Link></p>
          </div>
        </div>
      </div>

      <div className="auth-image-side">
        <div className="image-content">
          <h2>QAForge</h2>
          <p>专业的测试管理平台，帮助团队高效管理测试用例、计划、缺陷和自动化测试。</p>

          <div className="image-features">
            <div className="feature-item">
              <div className="feature-icon">
                <Shield size={24} />
              </div>
              <span className="feature-text">测试用例</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <Zap size={24} />
              </div>
              <span className="feature-text">自动化</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <GitBranch size={24} />
              </div>
              <span className="feature-text">缺陷跟踪</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <BarChart3 size={24} />
              </div>
              <span className="feature-text">数据分析</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
