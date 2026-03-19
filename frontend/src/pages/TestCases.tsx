import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, X, ChevronRight, ChevronDown, Package, FolderOpen } from 'lucide-react'
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { testCasesApi, projectsApi, testSuitesApi, foldersApi } from '../services/api'
import ConfirmDialog from '../components/ConfirmDialog'

interface TestCase {
  id: string
  title: string
  module: string | null
  priority: string
  type: string
  status: string
  steps: string
  precondition: string | null
  expectedResult: string | null
  createdAt: string
  creatorId: string | null
  creatorName: string | null
  projectId?: string | null
  suiteId?: string | null
  folderId?: string | null
}

interface Project {
  id: string
  name: string
  description: string | null
}

interface TestSuite {
  id: string
  name: string
  description: string | null
  projectId: string
}

interface Folder {
  id: string
  name: string
  suiteId: string
  parentId: string | null
}

function getUser() {
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
}

// 可放置的树节点
function DroppableTreeItem({
  id,
  children,
  className,
  onClick
}: {
  id: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`${className}${isOver ? ' drag-over' : ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

// 可排序的用例项
function SortableTestCaseItem({ testCase, onEdit, onDelete }: { testCase: TestCase; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: testCase.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <tr ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <td style={{ width: '30px', cursor: 'grab' }}>⋮⋮</td>
      <td style={{ width: '80px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>
        {testCase.id.slice(0, 8)}
      </td>
      <td
        style={{
          maxWidth: '300px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
        title={testCase.title}
      >
        {testCase.title}
      </td>
      <td>{testCase.module || '-'}</td>
      <td>{testCase.type}</td>
      <td>
        <span className={`badge badge-${testCase.priority}`}>
          {testCase.priority === 'high' ? '高' : testCase.priority === 'medium' ? '中' : '低'}
        </span>
      </td>
      <td>
        <span className={`badge badge-${testCase.status}`}>
          {testCase.status === 'draft' ? '草稿' : testCase.status === 'executing' ? '执行中' : testCase.status === 'passed' ? '通过' : testCase.status === 'failed' ? '失败' : '阻塞'}
        </span>
      </td>
      <td>{testCase.creatorName || '-'}</td>
      <td>{testCase.createdAt ? new Date(testCase.createdAt).toLocaleDateString() : '-'}</td>
      <td>
        <div className="actions" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-secondary btn-sm" onClick={onEdit}>
            <Edit size={14} />
          </button>
          <button className="btn btn-danger btn-sm" onClick={onDelete}>
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// 拖拽时的 Overlay
function DragOverlayItem({ testCase }: { testCase: TestCase }) {
  return (
    <div style={{
      padding: '12px 16px',
      background: 'var(--primary-bg)',
      border: '2px solid var(--primary)',
      borderRadius: '8px',
      boxShadow: 'var(--shadow-lg)',
      opacity: 0.9
    }}>
      {testCase.title}
    </div>
  )
}

export default function TestCases() {
  const [projects, setProjects] = useState<Project[]>([])
  const [suites, setSuites] = useState<TestSuite[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [cases, setCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(true)

  // 树形展开状态
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set())
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  // 选中状态
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [selectedSuite, setSelectedSuite] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)

  // 弹窗状态
  const [showModal, setShowModal] = useState(false)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [showSuiteModal, setShowSuiteModal] = useState(false)
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [editingCase, setEditingCase] = useState<TestCase | null>(null)

  // 搜索
  const [search, setSearch] = useState('')

  // 拖拽状态
  const [activeId, setActiveId] = useState<string | null>(null)

  // 删除状态
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'project' | 'suite' | 'folder'; id: string; name: string } | null>(null)
  const [deleteCaseId, setDeleteCaseId] = useState<string | null>(null)

  const user = getUser()

  // 配置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [projectsRes, suitesRes, foldersRes, casesRes] = await Promise.all([
        projectsApi.getAll(),
        testSuitesApi.getAll({}),
        foldersApi.getAll({}),
        testCasesApi.getAll({})
      ])
      setProjects(projectsRes.data)
      setSuites(suitesRes.data)
      setFolders(foldersRes.data)
      setCases(casesRes.data)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId)
    } else {
      newExpanded.add(projectId)
    }
    setExpandedProjects(newExpanded)
  }

  const toggleSuite = (suiteId: string) => {
    const newExpanded = new Set(expandedSuites)
    if (newExpanded.has(suiteId)) {
      newExpanded.delete(suiteId)
    } else {
      newExpanded.add(suiteId)
    }
    setExpandedSuites(newExpanded)
  }

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  // 获取某个项目下的测试套件
  const getSuitesForProject = (projectId: string) => suites.filter(s => s.projectId === projectId)

  // 获取某个测试套件下的文件夹
  const getFoldersForSuite = (suiteId: string) => folders.filter(f => f.suiteId === suiteId && !f.parentId)

  // 获取某个文件夹下的子文件夹
  const getChildFolders = (parentId: string) => folders.filter(f => f.parentId === parentId)

  // 创建项目
  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    try {
      await projectsApi.create({
        name: formData.get('name'),
        description: formData.get('description'),
        creatorId: user?.id
      })
      fetchAllData()
      setShowProjectModal(false)
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  // 创建测试套件
  const handleCreateSuite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    try {
      await testSuitesApi.create({
        name: formData.get('name'),
        description: formData.get('description'),
        projectId: selectedProject,
        creatorId: user?.id
      })
      fetchAllData()
      setShowSuiteModal(false)
    } catch (error) {
      console.error('Failed to create suite:', error)
    }
  }

  // 创建文件夹
  const handleCreateFolder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    try {
      await foldersApi.create({
        name: formData.get('name'),
        suiteId: selectedSuite,
        parentId: selectedFolder || null,
        creatorId: user?.id
      })
      fetchAllData()
      setShowFolderModal(false)
    } catch (error) {
      console.error('Failed to create folder:', error)
    }
  }

  // 创建/编辑测试用例
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      title: formData.get('title'),
      module: formData.get('module'),
      priority: formData.get('priority'),
      type: formData.get('type'),
      status: formData.get('status'),
      precondition: formData.get('precondition'),
      steps: formData.get('steps'),
      expectedResult: formData.get('expectedResult'),
      projectId: selectedProject,
      suiteId: selectedSuite,
      folderId: selectedFolder,
      creatorId: user?.id,
      creatorName: user?.username
    }

    try {
      if (editingCase) {
        await testCasesApi.update(editingCase.id, data)
      } else {
        await testCasesApi.create(data)
      }
      fetchAllData()
      setShowModal(false)
      setEditingCase(null)
    } catch (error) {
      console.error('Failed to save test case:', error)
    }
  }

  const handleDelete = (id: string) => {
    setDeleteCaseId(id)
  }

  const confirmDeleteCase = async () => {
    if (!deleteCaseId) return
    try {
      await testCasesApi.delete(deleteCaseId)
      fetchAllData()
      setDeleteCaseId(null)
    } catch (error) {
      console.error('Failed to delete test case:', error)
    }
  }

  const handleDeleteEntity = async () => {
    if (!deleteTarget) return
    try {
      if (deleteTarget.type === 'project') {
        await projectsApi.delete(deleteTarget.id)
      } else if (deleteTarget.type === 'suite') {
        await testSuitesApi.delete(deleteTarget.id)
      } else if (deleteTarget.type === 'folder') {
        await foldersApi.delete(deleteTarget.id)
      }
      fetchAllData()
      setDeleteTarget(null)
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }

  // 获取当前选中的用例
  const getSelectedCases = () => {
    let filtered = cases
    if (selectedFolder) {
      // 选中文件夹 - 只显示该文件夹下的用例
      filtered = filtered.filter(c => c.folderId === selectedFolder)
    } else if (selectedSuite) {
      // 选中测试套件 - 显示该套件下（无文件夹）的用例
      filtered = filtered.filter(c => c.suiteId === selectedSuite && !c.folderId)
    } else if (selectedProject) {
      // 选中项目 - 显示该项目下（无测试套件）的用例
      filtered = filtered.filter(c => c.projectId === selectedProject && !c.suiteId)
    } else {
      // 全部项目 - 只显示没有归属任何项目的用例（根级用例）
      filtered = filtered.filter(c => !c.projectId && !c.suiteId && !c.folderId)
    }
    if (search) {
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        (c.module && c.module.toLowerCase().includes(search.toLowerCase()))
      )
    }
    return filtered
  }

  const displayCases = getSelectedCases()
  const activeCase = activeId ? cases.find(c => c.id === activeId) : null

  // 处理拖拽结束
  const handleDragEnd = async (event: any) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeCaseId = active.id
    const overId = over.id

    // 解析目标节点的类型和ID
    // 目标ID格式: "project-{id}", "suite-{id}", "folder-{id}"
    let targetProjectId: string | null = null
    let targetSuiteId: string | null = null
    let targetFolderId: string | null = null

    if (overId.toString().startsWith('project-')) {
      targetProjectId = overId.toString().replace('project-', '')
    } else if (overId.toString().startsWith('suite-')) {
      targetSuiteId = overId.toString().replace('suite-', '')
      // 获取对应的项目ID
      const suite = suites.find(s => s.id === targetSuiteId)
      if (suite) targetProjectId = suite.projectId
    } else if (overId.toString().startsWith('folder-')) {
      targetFolderId = overId.toString().replace('folder-', '')
      // 获取对应的套件和项目ID
      const folder = folders.find(f => f.id === targetFolderId)
      if (folder) {
        targetSuiteId = folder.suiteId
        const suite = suites.find(s => s.id === targetSuiteId)
        if (suite) targetProjectId = suite.projectId
      }
    }

    // 移动用例
    try {
      await testCasesApi.move(activeCaseId, {
        projectId: targetProjectId || undefined,
        suiteId: targetSuiteId || undefined,
        folderId: targetFolderId || undefined
      })
      fetchAllData()
    } catch (error) {
      console.error('Failed to move test case:', error)
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(event) => setActiveId(event.active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <header className="page-header">
          <h2>测试用例</h2>
          <button
            className="btn btn-primary"
            onClick={() => { setEditingCase(null); setShowModal(true) }}
            disabled={!selectedProject}
            title={!selectedProject ? '请先选择一个项目' : '新建用例'}
          >
            <Plus size={18} />新建用例
          </button>
        </header>

        <div className="page-content">
          <div style={{ display: 'flex', gap: '20px' }}>
            {/* 左侧树形结构 - 可作为拖放目标 */}
            <div className="card" style={{ width: '320px', flexShrink: 0, maxHeight: 'calc(100vh - 180px)', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600 }}>项目结构</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowProjectModal(true)}>
                  <Plus size={14} />
                </button>
              </div>

              {loading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>加载中...</div>
              ) : (
                <div className="tree-view">
                  {/* 全部项目 - 根级用例的放置目标 */}
                  <DroppableTreeItem
                    id="all-projects"
                    className={`tree-item ${!selectedProject && !selectedSuite && !selectedFolder ? 'selected' : ''}`}
                    onClick={() => { setSelectedProject(null); setSelectedSuite(null); setSelectedFolder(null) }}
                  >
                    <span style={{ width: '16px' }} />
                    <Package size={16} />
                    <span style={{ flex: 1 }}>全部项目</span>
                  </DroppableTreeItem>

                  {projects.map(project => (
                    <div key={project.id}>
                      {/* 项目层级 - 可放置 */}
                      <DroppableTreeItem
                        id={`project-${project.id}`}
                        className={`tree-item ${selectedProject === project.id ? 'selected' : ''}`}
                        onClick={() => { setSelectedProject(project.id); setSelectedSuite(null); setSelectedFolder(null) }}
                      >
                        <span onClick={(e) => { e.stopPropagation(); toggleProject(project.id) }}>
                          {expandedProjects.has(project.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </span>
                        <Package size={16} />
                        <span style={{ flex: 1 }}>{project.name}</span>
                        <button
                          className="tree-action"
                          onClick={(e) => { e.stopPropagation(); setSelectedProject(project.id); setShowSuiteModal(true) }}
                          title="添加测试套件"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          className="tree-action"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'project', id: project.id, name: project.name }) }}
                          title="删除项目"
                        >
                          <X size={14} />
                        </button>
                      </DroppableTreeItem>

                      {/* 测试套件层级 - 可放置 */}
                      {expandedProjects.has(project.id) && getSuitesForProject(project.id).map(suite => (
                        <div key={suite.id} style={{ paddingLeft: '24px' }}>
                          <DroppableTreeItem
                            id={`suite-${suite.id}`}
                            className={`tree-item ${selectedSuite === suite.id && !selectedFolder ? 'selected' : ''}`}
                            onClick={() => { setSelectedProject(project.id); setSelectedSuite(suite.id); setSelectedFolder(null) }}
                          >
                            <span onClick={(e) => { e.stopPropagation(); toggleSuite(suite.id) }}>
                              {expandedSuites.has(suite.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </span>
                            <FolderOpen size={16} />
                            <span style={{ flex: 1 }}>{suite.name}</span>
                            <button
                              className="tree-action"
                              onClick={(e) => { e.stopPropagation(); setSelectedSuite(suite.id); setShowFolderModal(true) }}
                              title="添加文件夹"
                            >
                              <Plus size={14} />
                            </button>
                            <button
                              className="tree-action"
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'suite', id: suite.id, name: suite.name }) }}
                              title="删除测试套件"
                            >
                              <X size={14} />
                            </button>
                          </DroppableTreeItem>

                          {/* 文件夹层级 - 可放置 */}
                          {expandedSuites.has(suite.id) && getFoldersForSuite(suite.id).map(folder => (
                            <div key={folder.id} style={{ paddingLeft: '24px' }}>
                              <DroppableTreeItem
                                id={`folder-${folder.id}`}
                                className={`tree-item ${selectedFolder === folder.id ? 'selected' : ''}`}
                                onClick={() => { setSelectedFolder(folder.id); setSelectedSuite(suite.id); setSelectedProject(project.id) }}
                              >
                                <span onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id) }}>
                                  {expandedFolders.has(folder.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </span>
                                <FolderOpen size={16} />
                                <span style={{ flex: 1 }}>{folder.name}</span>
                                <button
                                  className="tree-action"
                                  onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'folder', id: folder.id, name: folder.name }) }}
                                  title="删除文件夹"
                                >
                                  <X size={14} />
                                </button>
                              </DroppableTreeItem>

                              {/* 子文件夹 */}
                              {expandedFolders.has(folder.id) && getChildFolders(folder.id).map(childFolder => (
                                <div key={childFolder.id} style={{ paddingLeft: '24px' }}>
                                  <DroppableTreeItem
                                    id={`folder-${childFolder.id}`}
                                    className={`tree-item ${selectedFolder === childFolder.id ? 'selected' : ''}`}
                                    onClick={() => { setSelectedFolder(childFolder.id); setSelectedSuite(folder.suiteId); setSelectedProject(project.id) }}
                                  >
                                    <span style={{ width: '16px' }} />
                                    <FolderOpen size={16} />
                                    <span style={{ flex: 1 }}>{childFolder.name}</span>
                                    <button
                                      className="tree-action"
                                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'folder', id: childFolder.id, name: childFolder.name }) }}
                                      title="删除文件夹"
                                    >
                                      <X size={14} />
                                    </button>
                                  </DroppableTreeItem>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}

                  {projects.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      暂无项目，点击上方 + 创建
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 右侧用例列表 - 可拖拽 */}
            <div className="card" style={{ flex: 1 }}>
              <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="搜索用例..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  拖拽用例到左侧树节点移动位置
                </span>
              </div>

              {loading ? (
                <div className="empty-state">加载中...</div>
              ) : displayCases.length === 0 ? (
                <div className="empty-state">
                  {selectedProject ? (
                    <>
                      <p>暂无测试用例</p>
                      <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={18} />新建用例
                      </button>
                    </>
                  ) : (
                    <p>请在左侧选择一个项目以查看测试用例</p>
                  )}
                </div>
              ) : (
                <SortableContext items={displayCases.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: '30px' }}></th>
                          <th style={{ width: '80px' }}>ID</th>
                          <th>标题</th>
                          <th>模块</th>
                          <th>类型</th>
                          <th>优先级</th>
                          <th>状态</th>
                          <th>创建者</th>
                          <th>创建时间</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayCases.map((testCase) => (
                          <SortableTestCaseItem
                            key={testCase.id}
                            testCase={testCase}
                            onEdit={() => { setEditingCase(testCase); setShowModal(true) }}
                            onDelete={() => handleDelete(testCase.id)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SortableContext>
              )}
            </div>
          </div>
        </div>

        {/* 拖拽 Overlay */}
        <DragOverlay>
          {activeCase ? <DragOverlayItem testCase={activeCase} /> : null}
        </DragOverlay>
      </DndContext>

      {/* 新建用例弹窗 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCase ? '编辑用例' : '新建用例'}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">标题 *</label>
                  <input name="title" className="form-input" required defaultValue={editingCase?.title} />
                </div>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">模块</label>
                    <input name="module" className="form-input" defaultValue={editingCase?.module || ''} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">类型</label>
                    <select name="type" className="form-select" defaultValue={editingCase?.type || 'functional'}>
                      <option value="functional">功能测试</option>
                      <option value="api">接口测试</option>
                      <option value="performance">性能测试</option>
                      <option value="ui">UI测试</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">优先级</label>
                    <select name="priority" className="form-select" defaultValue={editingCase?.priority || 'medium'}>
                      <option value="high">高</option>
                      <option value="medium">中</option>
                      <option value="low">低</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">状态</label>
                    <select name="status" className="form-select" defaultValue={editingCase?.status || 'draft'}>
                      <option value="draft">草稿</option>
                      <option value="executing">执行中</option>
                      <option value="passed">通过</option>
                      <option value="failed">失败</option>
                      <option value="blocked">阻塞</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">前置条件</label>
                  <textarea name="precondition" className="form-textarea" defaultValue={editingCase?.precondition || ''} />
                </div>
                <div className="form-group">
                  <label className="form-label">测试步骤 *</label>
                  <textarea name="steps" className="form-textarea" required defaultValue={editingCase?.steps || ''} />
                </div>
                <div className="form-group">
                  <label className="form-label">预期结果</label>
                  <textarea name="expectedResult" className="form-textarea" defaultValue={editingCase?.expectedResult || ''} />
                </div>
                {user && (
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    创建者: {user.username}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 新建项目弹窗 */}
      {showProjectModal && (
        <div className="modal-overlay" onClick={() => setShowProjectModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>新建项目</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowProjectModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">项目名称 *</label>
                  <input name="name" className="form-input" required placeholder="请输入项目名称" />
                </div>
                <div className="form-group">
                  <label className="form-label">描述</label>
                  <textarea name="description" className="form-textarea" placeholder="请输入项目描述" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowProjectModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary">创建</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 新建测试套件弹窗 */}
      {showSuiteModal && (
        <div className="modal-overlay" onClick={() => setShowSuiteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>新建测试套件</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowSuiteModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateSuite}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">套件名称 *</label>
                  <input name="name" className="form-input" required placeholder="请输入套件名称" />
                </div>
                <div className="form-group">
                  <label className="form-label">描述</label>
                  <textarea name="description" className="form-textarea" placeholder="请输入套件描述" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSuiteModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary">创建</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 新建文件夹弹窗 */}
      {showFolderModal && (
        <div className="modal-overlay" onClick={() => setShowFolderModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>新建文件夹</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowFolderModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateFolder}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">文件夹名称 *</label>
                  <input name="name" className="form-input" required placeholder="请输入文件夹名称" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowFolderModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary">创建</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>确认删除</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setDeleteTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p>确定要删除{deleteTarget.type === 'project' ? '项目' : deleteTarget.type === 'suite' ? '测试套件' : '文件夹'}"{deleteTarget.name}"吗？</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px' }}>此操作不可恢复</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>取消</button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteEntity}>删除</button>
            </div>
          </div>
        </div>
      )}

      {/* 删除测试用例确认弹窗 */}
      {deleteCaseId && (
        <ConfirmDialog
          open={true}
          title="确认删除"
          message="确定要删除这个测试用例吗？"
          onConfirm={confirmDeleteCase}
          onCancel={() => setDeleteCaseId(null)}
          variant="danger"
        />
      )}
    </>
  )
}
