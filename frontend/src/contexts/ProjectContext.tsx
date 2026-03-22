import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { projectsApi } from '../services/api'

interface Project {
  id: string
  name: string
  description: string | null
}

interface ProjectContextType {
  currentProject: Project | null
  setCurrentProject: (project: Project | null) => void
  projects: Project[]
  isLoading: boolean
  refreshProjects: () => Promise<void>
  hasProjects: boolean
  isAdmin: boolean
  selectFirstProject: () => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

const PROJECT_STORAGE_KEY = 'currentProjectId'

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const refreshProjects = async () => {
    try {
      const res = await projectsApi.getAll()
      const projectsList = res.data.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description
      }))
      setProjects(projectsList)

      // Get user role from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      setIsAdmin(user.role === 'admin')

      // Restore current project from localStorage
      const savedProjectId = localStorage.getItem(PROJECT_STORAGE_KEY)
      if (savedProjectId) {
        const saved = projectsList.find((p: Project) => p.id === savedProjectId)
        if (saved) {
          setCurrentProjectState(saved)
        }
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshProjects()
  }, [])

  const selectFirstProject = () => {
    if (projects.length > 0) {
      // Sort by createdAt would be ideal, but we use the order from API (already sorted by createdAt desc)
      const first = projects[0]
      setCurrentProject(first)
    }
  }

  const hasProjects = projects.length > 0

  const setCurrentProject = (project: Project | null) => {
    setCurrentProjectState(project)
    if (project) {
      localStorage.setItem(PROJECT_STORAGE_KEY, project.id)
    } else {
      localStorage.removeItem(PROJECT_STORAGE_KEY)
    }
  }

  return (
    <ProjectContext.Provider value={{
      currentProject,
      setCurrentProject,
      projects,
      isLoading,
      refreshProjects,
      hasProjects,
      isAdmin,
      selectFirstProject
    }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider')
  }
  return context
}
