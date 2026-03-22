import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Edit, Trash2, X, ChevronRight, ChevronDown, ChevronLeft, FolderOpen, Upload, CheckCircle, XCircle, Download } from 'lucide-react'
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { testCasesApi, testSuitesApi, foldersApi } from '../services/api'
import { useProject } from '../contexts/ProjectContext'
import ConfirmDialog from '../components/ConfirmDialog'
import TruncatedCell from '../components/TruncatedCell'

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
function SortableTestCaseItem({ testCase, onEdit, onDelete, isSelected, onToggleSelect }: { testCase: TestCase; onEdit: () => void; onDelete: () => void; isSelected?: boolean; onToggleSelect?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: testCase.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isSelected ? 'var(--primary-bg)' : undefined,
  }

  return (
    <tr ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <td style={{ width: '30px', cursor: 'grab' }}>
        <input
          type="checkbox"
          checked={isSelected || false}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: 'pointer' }}
        />
      </td>
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

// 递归渲染文件夹树
function FolderTreeItem({
  folder,
  depth,
  expandedFolders,
  selectedFolder,
  onToggleFolder,
  onSelectFolder,
  onAddSubFolder,
  onDeleteFolder,
  getChildFolders
}: {
  folder: Folder
  depth: number
  expandedFolders: Set<string>
  selectedFolder: string | null
  onToggleFolder: (id: string) => void
  onSelectFolder: (id: string) => void
  onAddSubFolder: (id: string) => void
  onDeleteFolder: (id: string, name: string) => void
  getChildFolders: (parentId: string) => Folder[]
}) {
  const children = getChildFolders(folder.id)
  const hasChildren = children.length > 0
  const isExpanded = expandedFolders.has(folder.id)

  return (
    <div style={{ paddingLeft: depth === 0 ? '0' : '24px' }}>
      <DroppableTreeItem
        id={`folder-${folder.id}`}
        className={`tree-item ${selectedFolder === folder.id ? 'selected' : ''}`}
        onClick={() => onSelectFolder(folder.id)}
      >
        <span onClick={(e) => { e.stopPropagation(); onToggleFolder(folder.id) }}>
          {hasChildren ? (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />) : <span style={{ width: '16px' }} />}
        </span>
        <FolderOpen size={16} />
        <span style={{ flex: 1 }}>{folder.name}</span>
        <button
          className="tree-action"
          onClick={(e) => { e.stopPropagation(); onAddSubFolder(folder.id) }}
          title="添加子文件夹"
        >
          <Plus size={14} />
        </button>
        <button
          className="tree-action"
          onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id, folder.name) }}
          title="删除文件夹"
        >
          <X size={14} />
        </button>
      </DroppableTreeItem>

      {/* 递归渲染子文件夹 */}
      {hasChildren && isExpanded && children.map(childFolder => (
        <FolderTreeItem
          key={childFolder.id}
          folder={childFolder}
          depth={depth + 1}
          expandedFolders={expandedFolders}
          selectedFolder={selectedFolder}
          onToggleFolder={onToggleFolder}
          onSelectFolder={onSelectFolder}
          onAddSubFolder={onAddSubFolder}
          onDeleteFolder={onDeleteFolder}
          getChildFolders={getChildFolders}
        />
      ))}
    </div>
  )
}

export default function TestCases() {
  const { currentProject } = useProject()
  const [suites, setSuites] = useState<TestSuite[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [cases, setCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(true)

  // 树形展开状态
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  // 选中状态
  const [selectedSuite, setSelectedSuite] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)

  // 弹窗状态
  const [showModal, setShowModal] = useState(false)
  const [showSuiteModal, setShowSuiteModal] = useState(false)
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [parentFolderId, setParentFolderId] = useState<string | null>(null)
  const [editingCase, setEditingCase] = useState<TestCase | null>(null)

  // 搜索
  const [search, setSearch] = useState('')

  // 拖拽状态
  const [activeId, setActiveId] = useState<string | null>(null)

  // 删除状态
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'suite' | 'folder'; id: string; name: string } | null>(null)
  const [deleteCaseId, setDeleteCaseId] = useState<string | null>(null)

  // 批量选择状态
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set())
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState<string[] | null>(null)

  // 导入弹窗状态
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<{ success: boolean; total: number; imported: number; failed: number; errors: { row: number; message: string }[] } | null>(null)
  const [importing, setImporting] = useState(false)
  const [previewData, setPreviewData] = useState<string[][]>([])
  const [importSuiteId, setImportSuiteId] = useState<string>('')
  const [importFolderId, setImportFolderId] = useState<string>('')
  const importResultRef = useRef<HTMLDivElement>(null)

  // Reset import state when modal opens with new project
  useEffect(() => {
    if (showImportModal) {
      setImportSuiteId('')
      setImportFolderId('')
      setImportFile(null)
      setImportResult(null)
    }
  }, [showImportModal, currentProject])

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
      const [suitesRes, foldersRes, casesRes] = await Promise.all([
        testSuitesApi.getAll({}),
        foldersApi.getAll({}),
        testCasesApi.getAll({})
      ])
      setSuites(suitesRes.data)
      setFolders(foldersRes.data)
      setCases(casesRes.data)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
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

  // 获取当前项目下的测试套件
  const getSuitesForCurrentProject = () => suites.filter(s => s.projectId === currentProject?.id)

  // 获取某个测试套件下的文件夹
  const getFoldersForSuite = (suiteId: string) => folders.filter(f => f.suiteId === suiteId && !f.parentId)

  // 获取某个文件夹下的子文件夹
  const getChildFolders = (parentId: string) => folders.filter(f => f.parentId === parentId)

  // 创建测试套件
  const handleCreateSuite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    try {
      await testSuitesApi.create({
        name: formData.get('name'),
        description: formData.get('description'),
        projectId: currentProject?.id,
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
        parentId: parentFolderId,
        creatorId: user?.id
      })
      fetchAllData()
      setShowFolderModal(false)
      setParentFolderId(null)
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
      projectId: currentProject?.id,
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

  // 正确的 CSV 解析函数（处理引号内换行）
  function parseCSVRows(text: string, maxRows: number): string[][] {
    const rows: string[][] = []
    let currentRow: string[] = []
    let currentField = ''
    let inQuotes = false
    let rowCount = 0

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const nextChar = text[i + 1]

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            // 转义的双引号
            currentField += '"'
            i++
          } else {
            // 结束引号
            inQuotes = false
          }
        } else {
          currentField += char
        }
      } else {
        if (char === '"') {
          inQuotes = true
        } else if (char === ',') {
          currentRow.push(currentField.trim())
          currentField = ''
        } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
          // 行结束
          currentRow.push(currentField.trim())
          if (currentRow.some(f => f.length > 0)) {
            rows.push(currentRow)
            rowCount++
            if (rowCount >= maxRows) return rows
          }
          currentRow = []
          currentField = ''
          if (char === '\r') i++ // 跳过 \r
        } else if (char !== '\r') {
          currentField += char
        }
      }
    }

    // 最后一行
    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField.trim())
      if (currentRow.some(f => f.length > 0)) {
        rows.push(currentRow)
      }
    }

    return rows
  }

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImportFile(file)
      setImportResult(null)
      // 预览 CSV 前 5 行
      const reader = new FileReader()
      reader.onload = (event) => {
        const buffer = event.target?.result as ArrayBuffer
        const bytes = new Uint8Array(buffer)

        // Detect encoding and decode
        let text: string
        let hasUtf8Bom = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF
        let startIndex = hasUtf8Bom ? 3 : 0
        let contentBytes = bytes.slice(startIndex)

        // Check if valid UTF-8
        let isUtf8 = true
        let i = 0
        while (i < contentBytes.length) {
          const byte = contentBytes[i]
          if (byte > 127) {
            let continuationBytes = 0
            if ((byte & 0xE0) === 0xC0) continuationBytes = 1
            else if ((byte & 0xF0) === 0xE0) continuationBytes = 2
            else if ((byte & 0xF8) === 0xF0) continuationBytes = 3
            else { isUtf8 = false; break }

            if (i + continuationBytes >= contentBytes.length) { isUtf8 = false; break }
            for (let j = 1; j <= continuationBytes; j++) {
              if ((contentBytes[i + j] & 0xC0) !== 0x80) { isUtf8 = false; break }
            }
            if (!isUtf8) break
            i += continuationBytes + 1
          } else {
            i++
          }
        }

        if (isUtf8) {
          text = new TextDecoder('utf-8').decode(bytes.slice(hasUtf8Bom ? 3 : 0))
        } else {
          // GBK/GB2312 fallback
          text = new TextDecoder('gbk').decode(bytes)
        }

        // 正确解析 CSV（处理引号内换行）
        const preview: string[][] = []
        const rows = parseCSVRows(text, 6)
        for (const row of rows) {
          preview.push(row)
        }
        setPreviewData(preview)
      }
      reader.readAsArrayBuffer(file)
    }
  }

  // 执行导入
  const handleImport = async () => {
    if (!importFile || !currentProject) return
    setImporting(true)
    setImportResult(null)

    const formData = new FormData()
    formData.append('file', importFile)
    if (currentProject?.id) formData.append('projectId', currentProject.id)
    if (importSuiteId) formData.append('suiteId', importSuiteId)
    if (importFolderId) formData.append('folderId', importFolderId)
    if (user?.id) formData.append('creatorId', user.id)
    if (user?.username) formData.append('creatorName', user.username)

    try {
      const res = await testCasesApi.importCsv(formData)
      setImportResult(res.data)
      if (res.data.imported > 0) {
        fetchAllData()
      }
      // 滚动到导入结果
      setTimeout(() => importResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100)
    } catch (error: any) {
      setImportResult({
        success: false,
        total: 0,
        imported: 0,
        failed: 0,
        errors: [{ row: 0, message: error.response?.data?.error || '导入失败' }]
      })
      // 滚动到导入结果
      setTimeout(() => importResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100)
    } finally {
      setImporting(false)
    }
  }

  // 下载 CSV 模板
  const handleDownloadTemplate = async () => {
    try {
      const API_BASE_URL = ''
      const response = await fetch(`${API_BASE_URL}/api/v1/test-cases/template`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'test_case_template.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download template:', error)
    }
  }

  // 关闭导入弹窗并重置状态
  const closeImportModal = () => {
    setShowImportModal(false)
    setImportFile(null)
    setImportResult(null)
    setPreviewData([])
    setImportSuiteId('')
    setImportFolderId('')
  }

  const handleDeleteEntity = async () => {
    if (!deleteTarget) return
    try {
      if (deleteTarget.type === 'suite') {
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
    if (!currentProject) return []
    if (!selectedSuite) return []  // 必须先选择测试套件
    let filtered = cases.filter(c => c.projectId === currentProject.id)
    if (selectedFolder) {
      // 选中文件夹 - 只显示该文件夹下的用例
      filtered = filtered.filter(c => c.folderId === selectedFolder)
    } else if (selectedSuite) {
      // 选中测试套件 - 显示该套件下（无文件夹）的用例
      filtered = filtered.filter(c => c.suiteId === selectedSuite && !c.folderId)
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

  // 选择辅助函数
  const toggleCaseSelection = (id: string) => {
    setSelectedCaseIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedCaseIds.size === displayCases.length) {
      setSelectedCaseIds(new Set())
    } else {
      setSelectedCaseIds(new Set(displayCases.map(c => c.id)))
    }
  }

  const isAllSelected = displayCases.length > 0 && selectedCaseIds.size === displayCases.length

  const confirmBatchDelete = async () => {
    if (!batchDeleteConfirm || batchDeleteConfirm.length === 0) return
    try {
      await testCasesApi.deleteBatch(batchDeleteConfirm)
      setSelectedCaseIds(new Set())
      setBatchDeleteConfirm(null)
      fetchAllData()
    } catch (error) {
      console.error('Failed to batch delete test cases:', error)
    }
  }

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
          <div style={{ display: 'flex', gap: '8px' }}>
            {selectedCaseIds.size > 0 && (
              <button
                className="btn btn-danger"
                onClick={() => setBatchDeleteConfirm(Array.from(selectedCaseIds))}
              >
                <Trash2 size={18} />删除已选({selectedCaseIds.size})
              </button>
            )}
            <button
              className="btn btn-secondary"
              onClick={() => setShowImportModal(true)}
            >
              <Upload size={18} />导入
            </button>
            {!selectedSuite && currentProject && (
              <button
                className="btn btn-primary"
                onClick={() => setShowSuiteModal(true)}
              >
                <Plus size={18} />创建测试套件
              </button>
            )}
            {selectedSuite && (
              <button
                className="btn btn-primary"
                onClick={() => { setEditingCase(null); setShowModal(true) }}
              >
                <Plus size={18} />新建用例
              </button>
            )}
          </div>
        </header>

        <div className="page-content">
          <div style={{ display: 'flex', gap: '20px' }}>
            {/* 左侧树形结构 - 可作为拖放目标 */}
            <div className="card" style={{ width: '320px', flexShrink: 0, maxHeight: 'calc(100vh - 180px)', overflow: 'auto' }}>
              {!currentProject ? (
                <div className="empty-state">
                  <FolderOpen size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>请先选择项目</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>从左侧边栏选择项目以查看测试套件</p>
                </div>
              ) : loading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>加载中...</div>
              ) : (
                <div className="tree-view">
                  {/* 选中的测试套件信息 */}
                  {selectedSuite && (
                    <div className="selected-suite-header">
                      <button
                        onClick={() => { setSelectedSuite(null); setSelectedFolder(null) }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'none',
                          border: 'none',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          color: 'var(--text-secondary)',
                          fontSize: '13px',
                          borderRadius: '4px',
                          marginBottom: '4px'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.background = 'var(--bg-hover)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'none' }}
                      >
                        <ChevronLeft size={16} />
                        返回
                      </button>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>当前测试套件:</span>
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>{suites.find(s => s.id === selectedSuite)?.name}</span>
                    </div>
                  )}

                  {/* 测试套件列表 */}
                  {getSuitesForCurrentProject().length === 0 ? (
                    <div className="empty-state">
                      <FolderOpen size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                      <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>暂无测试套件</h3>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowSuiteModal(true)}
                        style={{ marginTop: '8px' }}
                      >
                        <Plus size={14} /> 添加测试套件
                      </button>
                    </div>
                  ) : (
                    getSuitesForCurrentProject().map(suite => (
                      <div key={suite.id}>
                        {/* 测试套件层级 */}
                        <DroppableTreeItem
                          id={`suite-${suite.id}`}
                          className={`tree-item ${selectedSuite === suite.id ? 'selected' : ''}`}
                          onClick={() => { setSelectedSuite(suite.id); setSelectedFolder(null) }}
                        >
                          <FolderOpen size={16} />
                          <span style={{ flex: 1 }}>{suite.name}</span>
                          {selectedSuite === suite.id && (
                            <button
                              className="tree-action"
                              onClick={(e) => { e.stopPropagation(); setShowFolderModal(true) }}
                              title="添加文件夹"
                            >
                              <Plus size={14} />
                            </button>
                          )}
                        </DroppableTreeItem>

                        {/* 文件夹层级 - 仅在选中此套件时显示 */}
                        {selectedSuite === suite.id && getFoldersForSuite(suite.id).map(folder => (
                          <FolderTreeItem
                            key={folder.id}
                            folder={folder}
                            depth={0}
                            expandedFolders={expandedFolders}
                            selectedFolder={selectedFolder}
                            onToggleFolder={toggleFolder}
                            onSelectFolder={setSelectedFolder}
                            onAddSubFolder={(id) => { setSelectedFolder(id); setParentFolderId(id); setShowFolderModal(true) }}
                            onDeleteFolder={(id, name) => setDeleteTarget({ type: 'folder', id, name })}
                            getChildFolders={getChildFolders}
                          />
                        ))}
                      </div>
                    ))
                  )}

                  {/* 未选中测试套件时的提示 */}
                  {getSuitesForCurrentProject().length > 0 && !selectedSuite && (
                    <div className="empty-state" style={{ padding: '20px' }}>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>请点击选择一个测试套件以查看文件夹</p>
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
                  {!currentProject ? (
                    <p>请从左侧边栏选择项目以查看测试用例</p>
                  ) : !selectedSuite ? (
                    <p>请先选择一个测试套件</p>
                  ) : (
                    <p>暂无测试用例，请点击右上角的「新建用例」按钮添加</p>
                  )}
                </div>
              ) : (
                <SortableContext items={displayCases.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: '50px' }}>
                            <input
                              type="checkbox"
                              checked={isAllSelected}
                              onChange={toggleSelectAll}
                              style={{ cursor: 'pointer' }}
                            />
                          </th>
                          <th style={{ width: '80px' }}>ID</th>
                          <th>标题</th>
                          <th>模块</th>
                          <th>类型</th>
                          <th>优先级</th>
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
                            isSelected={selectedCaseIds.has(testCase.id)}
                            onToggleSelect={() => toggleCaseSelection(testCase.id)}
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
        <div className="modal-overlay" onClick={() => { setShowFolderModal(false); setParentFolderId(null) }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>{parentFolderId ? '新建子文件夹' : '新建文件夹'}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowFolderModal(false); setParentFolderId(null) }}>
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
                <button type="button" className="btn btn-secondary" onClick={() => { setShowFolderModal(false); setParentFolderId(null) }}>取消</button>
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
              <p>确定要删除{deleteTarget.type === 'suite' ? '测试套件' : '文件夹'}"{deleteTarget.name}"吗？</p>
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

      {/* 批量删除测试用例确认弹窗 */}
      {batchDeleteConfirm && (
        <ConfirmDialog
          open={true}
          title="确认批量删除"
          message={`确定要删除选中的 ${batchDeleteConfirm.length} 个测试用例吗？此操作不可恢复。`}
          onConfirm={confirmBatchDelete}
          onCancel={() => setBatchDeleteConfirm(null)}
          variant="danger"
        />
      )}

      {/* 导入 CSV 弹窗 */}
      {showImportModal && (
        <div className="modal-overlay" onClick={closeImportModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>批量导入测试用例</h3>
              <button className="btn btn-secondary btn-sm" onClick={closeImportModal}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {/* 目标层级选择 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">测试套件</label>
                  <select
                    className="form-select"
                    value={importSuiteId}
                    onChange={e => { setImportSuiteId(e.target.value); setImportFolderId('') }}
                    disabled={!currentProject}
                  >
                    <option value="">选择套件（可选）</option>
                    {suites.filter(s => s.projectId === currentProject?.id).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">文件夹</label>
                  <select
                    className="form-select"
                    value={importFolderId}
                    onChange={e => setImportFolderId(e.target.value)}
                    disabled={!importSuiteId}
                  >
                    <option value="">选择文件夹（可选）</option>
                    {folders.filter(f => f.suiteId === importSuiteId && !f.parentId).map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 文件选择 */}
              <div className="form-group">
                <label className="form-label">选择 CSV 文件</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label
                    className="btn btn-primary"
                    style={{ cursor: 'pointer' }}
                  >
                    <Upload size={18} />
                    {importFile ? '重新选择' : '选择文件'}
                    <input
                      type="file"
                      accept=".csv"
                      multiple={false}
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {importFile && (
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      {importFile.name}
                    </span>
                  )}
                </div>
              </div>

              {/* CSV 模板说明 */}
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                <p>CSV 格式要求：</p>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>标题（title）和测试步骤（steps）为必填字段</li>
                  <li>可选字段：module, priority, type, precondition, expectedResult</li>
                  <li>priority 可选值：high, medium, low</li>
                  <li>type 可选值：functional, api, performance, ui</li>
                </ul>
                <button
                  className="btn btn-secondary"
                  onClick={handleDownloadTemplate}
                  style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={16} />
                  下载模板文件
                </button>
              </div>

              {/* 预览 */}
              {previewData.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>预览（前 5 行）：</div>
                  <div style={{ overflowX: 'auto', fontSize: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                      <thead>
                        <tr>
                          {previewData[0].map((header, i) => (
                            <th key={i} style={{ border: '1px solid var(--border-color)', padding: '6px 8px', textAlign: 'left', background: 'var(--bg-secondary)', width: i === previewData[0].length - 1 ? '200px' : '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.slice(1, 6).map((row, i) => (
                          <tr key={i}>
                            {row.map((cell, j) => (
                              <TruncatedCell key={j} content={cell} />
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 导入结果 */}
              {importResult && (
                <div ref={importResultRef} style={{ padding: '16px', background: importResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    {importResult.success ? (
                      <CheckCircle size={20} style={{ color: '#10b981' }} />
                    ) : (
                      <XCircle size={20} style={{ color: '#ef4444' }} />
                    )}
                    <span style={{ fontWeight: 500 }}>
                      {importResult.success ? '导入完成' : '导入失败'}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div>总行数：{importResult.total}</div>
                    <div style={{ color: '#10b981' }}>成功：{importResult.imported}</div>
                    <div style={{ color: importResult.failed > 0 ? '#ef4444' : 'inherit' }}>失败：{importResult.failed}</div>
                  </div>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <div style={{ fontWeight: 500, marginBottom: '4px' }}>错误详情：</div>
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <div key={i}>行 {err.row}: {err.message}</div>
                      ))}
                      {importResult.errors.length > 5 && (
                        <div>...还有 {importResult.errors.length - 5} 个错误</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                导入到：
                {currentProject ? `项目: ${currentProject.name}` : '未选择'}
                {importSuiteId ? ` > 套件: ${suites.find(s => s.id === importSuiteId)?.name}` : ''}
                {importFolderId ? ` > 文件夹: ${folders.find(f => f.id === importFolderId)?.name}` : ''}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={closeImportModal}>关闭</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleImport}
                  disabled={!importFile || !currentProject || importing}
                >
                  {importing ? '导入中...' : '开始导入'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
