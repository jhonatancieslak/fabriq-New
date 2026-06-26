// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8190'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('fabriq_token')
}

function getTenantSlug(): string {
  if (typeof window === 'undefined') return 'demo'
  return localStorage.getItem('fabriq_tenant') ?? 'demo'
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const slug = getTenantSlug()

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Slug': slug,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    localStorage.removeItem('fabriq_token')
    window.location.href = '/login'
    throw new Error('Sessão expirada')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(err.error ?? 'Erro no servidor')
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ tokens: { accessToken: string; refreshToken: string }; user: { id: string; name: string; role: string }; tenant: { slug: string; name: string } }>(
        '/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }
      ),
    logout: (refreshToken: string) =>
      request('/api/v1/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  },

  clients: {
    list: (search?: string) =>
      request<Client[]>(`/api/v1/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    get: (id: string) => request<Client>(`/api/v1/clients/${id}`),
    create: (data: Partial<Client>) =>
      request<Client>('/api/v1/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Client>) =>
      request<Client>(`/api/v1/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/v1/clients/${id}`, { method: 'DELETE' }),
  },

  projects: {
    list: (clientId?: string) =>
      request<Project[]>(`/api/v1/projects${clientId ? `?clientId=${clientId}` : ''}`),
    get: (id: string) => request<Project>(`/api/v1/projects/${id}`),
    create: (data: Partial<Project>) =>
      request<Project>('/api/v1/projects', { method: 'POST', body: JSON.stringify(data) }),
  },

  orders: {
    list: (params?: { status?: string; projectId?: string; page?: number }) => {
      const q = new URLSearchParams(params as never).toString()
      return request<OrdersResponse>(`/api/v1/orders${q ? `?${q}` : ''}`)
    },
    get: (id: string) => request<Order>(`/api/v1/orders/${id}`),
    create: (data: unknown) =>
      request<Order>('/api/v1/orders', { method: 'POST', body: JSON.stringify(data) }),
    cancel: (id: string, reason?: string) =>
      request<Order>(`/api/v1/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
    verifyByAuthCode: (authCode: string) => request<Order>(`/api/v1/orders/auth/${authCode}`),
  },

  machines: {
    list: () => request<Machine[]>('/api/v1/machines'),
  },

  materials: {
    list: () => request<Material[]>('/api/v1/materials'),
  },

  operators: {
    list: () => request<Operator[]>('/api/v1/operators'),
    get:  (id: string) => request<Operator>(`/api/v1/operators/${id}`),
  },
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Client {
  id: string; name: string; taxId?: string; email?: string; phone?: string; address?: string
}
export interface Project {
  id: string; code: string; name: string; description?: string; status: string; clientId: string
  client?: { name: string }
}
export interface Machine { id: string; name: string; type: string; model?: string }
export interface Material { id: string; name: string; type: string }
export interface Operator { id: string; name: string; username: string; phone?: string }
export interface OrderStage {
  id: string; stageNumber: number; type: string; status: string
  operator?: { name: string }; machine?: { name: string }
}
export interface OrderItem {
  id: string; description: string; thicknessMm: number; quantityPlanned: number
  widthMm?: number; heightMm?: number; material?: { name: string }
}
export interface Order {
  id: string; orderNumber: string; status: string; authCode: string; accessToken: string
  notes?: string
  client: { name: string }; project: { name: string; code: string }
  stages: (OrderStage & { startedAt?: string; completedAt?: string })[]; items?: OrderItem[]
  createdAt: string
}
export interface OrdersResponse { orders: Order[]; total: number; page: number; pages: number }
