import { useState, useRef, useEffect } from 'react'
import { useProject } from '../contexts/ProjectContext'
import { Folder, ChevronDown, Check, AlertCircle } from 'lucide-react'

export default function ProjectSelector() {
  const { currentProject, projects, setCurrentProject, hasProjects, isAdmin, selectFirstProject, isLoading } = useProject()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Auto-select first project on mount if no project selected and has projects
  useEffect(() => {
    if (!isLoading && hasProjects && !currentProject) {
      selectFirstProject()
    }
  }, [isLoading, hasProjects, currentProject, selectFirstProject])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (project: typeof projects[0]) => {
    setCurrentProject(project)
    setIsOpen(false)
    setSearch('')
  }

  if (isLoading) {
    return (
      <div className="project-selector">
        <div className="project-selector-trigger disabled">
          <Folder size={16} />
          <span>加载中...</span>
        </div>
      </div>
    )
  }

  if (!hasProjects) {
    return (
      <div className="project-selector">
        <div className="project-selector-empty">
          <AlertCircle size={16} />
          <span>请联系管理员添加项目</span>
        </div>
      </div>
    )
  }

  return (
    <div className="project-selector" ref={dropdownRef}>
      <div
        className={`project-selector-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Folder size={16} />
        <span className="project-name">
          {currentProject?.name || '选择项目'}
        </span>
        <ChevronDown size={14} className={`chevron ${isOpen ? 'rotated' : ''}`} />
      </div>

      {isOpen && (
        <div className="project-selector-dropdown">
          <div className="project-selector-search">
            <input
              type="text"
              placeholder="搜索项目..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="project-selector-list">
            {filteredProjects.length === 0 ? (
              <div className="project-selector-empty-list">未找到匹配的项目</div>
            ) : (
              filteredProjects.map(project => (
                <div
                  key={project.id}
                  className={`project-selector-item ${currentProject?.id === project.id ? 'active' : ''}`}
                  onClick={() => handleSelect(project)}
                >
                  <div className="project-selector-item-icon">
                    <Folder size={16} />
                  </div>
                  <div className="project-selector-item-info">
                    <div className="project-selector-item-name">{project.name}</div>
                    {project.description && (
                      <div className="project-selector-item-desc">{project.description}</div>
                    )}
                  </div>
                  {currentProject?.id === project.id && (
                    <Check size={16} className="check-icon" />
                  )}
                </div>
              ))
            )}
          </div>
          {isAdmin && (
            <div className="project-selector-footer">
              <span className="admin-hint">管理员可在项目管理中添加新项目</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
