import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Zap, GitBranch, BarChart3 } from 'lucide-react'
import api from '../services/api'
import '../auth.css'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/login', { username, password })
      const { token, user } = response.data

      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))

      // 使用 window.location 刷新页面以重新初始化 App 组件
      window.location.href = '/'
    } catch (err: any) {
      setError(err.response?.data?.error || '用户名或密码错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-form-side">
        <div className="auth-card">
          <div className="auth-header">
            <h1>登录</h1>
            <p>欢迎回来，请输入账号信息</p>
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

            <button type="submit" disabled={loading}>
              {loading ? '登录中...' : '登 录'}
            </button>
          </form>

          <div className="auth-footer">
            <p>还没有账号？ <Link to="/register">去注册</Link></p>
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

export default Login
