import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 添加 token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器 - 处理 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // 使用 router 跳转而不是 window.location
      window.history.pushState(null, '', '/login')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
    return Promise.reject(error)
  }
)

// Projects
export const projectsApi = {
  getAll: () => api.get('/projects'),
  getById: (id: string) => api.get(`/projects/${id}`),
  create: (data: any) => api.post('/projects', data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  getStats: () => api.get('/projects/stats/summary'),
  getMembers: (projectId: string) => api.get(`/projects/${projectId}/members`),
  addMember: (projectId: string, data: { userId: string; role?: string }) =>
    api.post(`/projects/${projectId}/members`, data),
  updateMember: (projectId: string, userId: string, data: { role: string }) =>
    api.put(`/projects/${projectId}/members/${userId}`, data),
  removeMember: (projectId: string, userId: string) =>
    api.delete(`/projects/${projectId}/members/${userId}`)
}

// Users (admin only)
export const usersApi = {
  getAll: () => api.get('/users'),
  updateRole: (id: string, data: { role: string }) => api.put(`/users/${id}/role`, data)
}

// Test Suites
export const testSuitesApi = {
  getAll: (params?: { projectId?: string }) => api.get('/test-suites', { params }),
  getById: (id: string) => api.get(`/test-suites/${id}`),
  create: (data: any) => api.post('/test-suites', data),
  update: (id: string, data: any) => api.put(`/test-suites/${id}`, data),
  delete: (id: string) => api.delete(`/test-suites/${id}`)
}

// Folders
export const foldersApi = {
  getAll: (params?: { suiteId?: string }) => api.get('/folders', { params }),
  getById: (id: string) => api.get(`/folders/${id}`),
  create: (data: any) => api.post('/folders', data),
  update: (id: string, data: any) => api.put(`/folders/${id}`, data),
  delete: (id: string) => api.delete(`/folders/${id}`)
}

// Test Cases
export const testCasesApi = {
  getAll: (params?: { projectId?: string; suiteId?: string; folderId?: string; status?: string; priority?: string; search?: string }) =>
    api.get('/test-cases', { params }),
  getById: (id: string) => api.get(`/test-cases/${id}`),
  create: (data: any) => api.post('/test-cases', data),
  update: (id: string, data: any) => api.put(`/test-cases/${id}`, data),
  delete: (id: string) => api.delete(`/test-cases/${id}`),
  move: (id: string, data: { projectId?: string; suiteId?: string; folderId?: string }) =>
    api.patch(`/test-cases/${id}/move`, data),
  importCsv: (formData: FormData) =>
    api.post('/test-cases/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
}

// Test Plans
export const testPlansApi = {
  getAll: (params?: { status?: string }) => api.get('/test-plans', { params }),
  getById: (id: string) => api.get(`/test-plans/${id}`),
  create: (data: any) => api.post('/test-plans', data),
  update: (id: string, data: any) => api.put(`/test-plans/${id}`, data),
  delete: (id: string) => api.delete(`/test-plans/${id}`),
  execute: (id: string, data: { executor?: string; notes?: string }) =>
    api.post(`/test-plans/${id}/execute`, data)
}

// Defects
export const defectsApi = {
  getAll: (params?: { status?: string; severity?: string; priority?: string }) =>
    api.get('/defects', { params }),
  getById: (id: string) => api.get(`/defects/${id}`),
  create: (data: any) => api.post('/defects', data),
  update: (id: string, data: any) => api.put(`/defects/${id}`, data),
  delete: (id: string) => api.delete(`/defects/${id}`)
}

// API Tests
export const apiTestsApi = {
  execute: (data: { url: string; method: string; headers?: string; body?: string }) =>
    api.post('/api-tests/execute', data),
  getAll: () => api.get('/api-tests'),
  save: (data: any) => api.post('/api-tests/save', data),
  update: (id: string, data: any) => api.put(`/api-tests/${id}`, data),
  delete: (id: string) => api.delete(`/api-tests/${id}`),
  getHistory: (testId?: string) => api.get('/api-tests/history', { params: { testId } })
}

// Automation
export const automationApi = {
  getAll: (params?: { status?: string }) => api.get('/automation', { params }),
  getById: (id: string) => api.get(`/automation/${id}`),
  create: (data: any) => api.post('/automation', data),
  update: (id: string, data: any) => api.put(`/automation/${id}`, data),
  delete: (id: string) => api.delete(`/automation/${id}`),
  execute: (id: string) => api.post(`/automation/${id}/execute`)
}

export default api
