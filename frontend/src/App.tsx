import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { LayoutDashboard, FileText, Play, Bug, Globe, Zap, LogOut, User, Shield, LayoutList, AlertCircle } from 'lucide-react'
import { projectsApi } from './services/api'
import { ProjectProvider, useProject } from './contexts/ProjectContext'
import TestCases from './pages/TestCases'
import TestPlans from './pages/TestPlans'
import Defects from './pages/Defects'
import ApiTests from './pages/ApiTests'
import Automation from './pages/Automation'
import Login from './pages/Login'
import Register from './pages/Register'
import Users from './pages/Users'
import Projects from './pages/Projects'
import ProjectSelector from './components/ProjectSelector'

function getUser() {
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
}

function checkTokenExpiry() {
  const token = localStorage.getItem('token')
  if (!token) return false

  try {
    // JWT payload: base64Url encoded, middle part
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    const exp = decoded.exp * 1000 // convert to milliseconds
    const now = Date.now()

    if (now >= exp) {
      // Token expired, clear storage and redirect
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
      return true
    }
    return false
  } catch {
    return false
  }
}

function App() {
  const [user, setUser] = useState<any>(() => getUser())

  useEffect(() => {
    checkTokenExpiry()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('currentProjectId')
    setUser(null)
  }

  return (
    <ProjectProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/*"
            element={user ? <AppLayout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
        </Routes>
      </BrowserRouter>
    </ProjectProvider>
  )
}

function AppLayout({ user, onLogout }: { user: any; onLogout: () => void }) {
  const { hasProjects, isLoading } = useProject()

  // Show loading state
  if (isLoading) {
    return (
      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1>
              <div className="logo-icon">
                <Zap size={22} />
              </div>
              QAForge
            </h1>
          </div>
        </aside>
        <main className="main-content">
          <div className="loading-container">
            <div className="loading">加载中...</div>
          </div>
        </main>
      </div>
    )
  }

  // No projects - show empty state
  if (!hasProjects) {
    return (
      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1>
              <div className="logo-icon">
                <Zap size={22} />
              </div>
              QAForge
            </h1>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-item disabled">
              <LayoutDashboard size={20} />
              <span>概览</span>
            </div>
            <div className="nav-item disabled">
              <FileText size={20} />
              <span>测试用例</span>
            </div>
            <div className="nav-item disabled">
              <Play size={20} />
              <span>测试计划</span>
            </div>
            <div className="nav-item disabled">
              <Bug size={20} />
              <span>缺陷管理</span>
            </div>
            <div className="nav-item disabled">
              <Globe size={20} />
              <span>接口测试</span>
            </div>
            <div className="nav-item disabled">
              <Zap size={20} />
              <span>自动化测试</span>
            </div>
            {user?.role === 'admin' && (
              <>
                <NavLink to="/projects" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <LayoutList size={20} />
                  <span>项目管理</span>
                </NavLink>
                <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <Shield size={20} />
                  <span>用户管理</span>
                </NavLink>
              </>
            )}
          </nav>
          <div className="sidebar-footer">
            <div className="user-profile">
              <div className="user-avatar">
                <User size={20} />
              </div>
              <div className="user-details">
                <div className="user-name">{user?.username}</div>
                <div className="user-email">{user?.email}</div>
              </div>
            </div>
            <button className="logout-btn" onClick={onLogout}>
              <LogOut size={18} />
              <span>退出登录</span>
            </button>
          </div>
        </aside>
        <main className="main-content">
          <div className="empty-state-container">
            <div className="empty-state-card">
              <div className="empty-state-icon">
                <AlertCircle size={48} />
              </div>
              <h2>暂无可访问的项目</h2>
              <p>您还没有被添加到任何项目中。</p>
              <p>请联系管理员为您添加项目访问权限。</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>
            <div className="logo-icon">
              <Zap size={22} />
            </div>
            QAForge
          </h1>
        </div>

        {/* Project Selector */}
        <ProjectSelector />

        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
            <LayoutDashboard size={20} />
            <span>概览</span>
          </NavLink>
          <NavLink to="/test-cases" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <FileText size={20} />
            <span>测试用例</span>
          </NavLink>
          <NavLink to="/test-plans" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Play size={20} />
            <span>测试计划</span>
          </NavLink>
          <NavLink to="/defects" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Bug size={20} />
            <span>缺陷管理</span>
          </NavLink>
          <NavLink to="/api-tests" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Globe size={20} />
            <span>接口测试</span>
          </NavLink>
          <NavLink to="/automation" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Zap size={20} />
            <span>自动化测试</span>
          </NavLink>
          {user?.role === 'admin' && (
            <>
              <NavLink to="/projects" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <LayoutList size={20} />
                <span>项目管理</span>
              </NavLink>
              <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Shield size={20} />
                <span>用户管理</span>
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              <User size={20} />
            </div>
            <div className="user-details">
              <div className="user-name">{user?.username}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            <LogOut size={18} />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Overview user={user} />} />
          <Route path="/test-cases" element={<TestCases />} />
          <Route path="/test-plans" element={<TestPlans />} />
          <Route path="/defects" element={<Defects />} />
          <Route path="/api-tests" element={<ApiTests />} />
          <Route path="/automation" element={<Automation />} />
          <Route path="/users" element={user?.role === 'admin' ? <Users /> : <Navigate to="/" />} />
          <Route path="/projects" element={user?.role === 'admin' ? <Projects /> : <Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  )
}

function Overview({ user }: { user: any }) {
  const { currentProject } = useProject()
  const [stats, setStats] = useState<{ totalTestCases: number; projects: { id: string; name: string; testCaseCount: number }[] }>({
    totalTestCases: 0,
    projects: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    projectsApi.getStats()
      .then(res => {
        setStats(res.data)
      })
      .catch(err => console.error('Failed to fetch stats:', err))
      .finally(() => setLoading(false))
  }, [])

  const displayedCount = currentProject
    ? stats.projects.find(p => p.id === currentProject.id)?.testCaseCount ?? 0
    : stats.totalTestCases

  return (
    <>
      <header className="page-header">
        <div className="page-header-left">
          <h2>概览</h2>
        </div>
        <span className="welcome-text">欢迎回来，{user?.username}</span>
      </header>
      <div className="page-content">
        <div className="grid grid-3">
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div className="stat-label">测试用例</div>
              {currentProject && (
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{currentProject.name}</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="stat-icon primary">
                <FileText size={24} />
              </div>
              <div className="stat-value">{loading ? '-' : displayedCount}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon success">
              <Play size={24} />
            </div>
            <div className="stat-value">0</div>
            <div className="stat-label">测试计划</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon danger">
              <Bug size={24} />
            </div>
            <div className="stat-value">0</div>
            <div className="stat-label">缺陷</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <div>
              <div className="card-title">欢迎使用 QAForge</div>
              <div className="card-subtitle">一体化测试管理平台</div>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
            QAForge 是一个功能强大的测试管理平台，帮助团队高效管理测试用例、测试计划、缺陷跟踪和自动化测试。
            从左侧导航栏开始探索各项功能。
          </p>
        </div>
      </div>
    </>
  )
}

export default App
