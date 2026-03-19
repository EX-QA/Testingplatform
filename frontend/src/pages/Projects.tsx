import { useState, useEffect } from 'react'
import { Folder, Users } from 'lucide-react'
import { projectsApi } from '../services/api'
import ProjectMembers from '../components/ProjectMembers'

interface Project {
  id: string
  name: string
  description: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

interface ProjectWithStats extends Project {
  testCaseCount: number
}

export default function Projects() {
  const [projects, setProjects] = useState<ProjectWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<ProjectWithStats | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) setUser(JSON.parse(userStr))
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const res = await projectsApi.getAll()
      // Get stats for each project
      const projectsWithStats = await Promise.all(
        res.data.map(async (p: Project) => {
          try {
            const statsRes = await projectsApi.getStats()
            const projectStat = statsRes.data.projects?.find((proj: any) => proj.id === p.id)
            return {
              ...p,
              testCaseCount: projectStat?.testCaseCount ?? 0
            }
          } catch {
            return { ...p, testCaseCount: 0 }
          }
        })
      )
      setProjects(projectsWithStats)
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = user?.role === 'admin'

  return (
    <>
      <header className="page-header">
        <h2>项目管理</h2>
      </header>

      <div className="page-content">
        {loading ? (
          <div className="empty-state">加载中...</div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <Folder size={48} />
            <p>暂无项目</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>项目名称</th>
                  <th>描述</th>
                  <th>测试用例数</th>
                  <th>创建时间</th>
                  {isAdmin && <th>操作</th>}
                </tr>
              </thead>
              <tbody>
                {projects.map(project => (
                  <tr key={project.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Folder size={16} style={{ color: 'var(--text-secondary)' }} />
                        {project.name}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {project.description || '-'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {project.testCaseCount}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {new Date(project.createdAt).toLocaleDateString()}
                    </td>
                    {isAdmin && (
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedProject(project)}
                        >
                          <Users size={14} style={{ marginRight: '4px' }} />
                          成员管理
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedProject && isAdmin && (
        <ProjectMembers
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </>
  )
}
