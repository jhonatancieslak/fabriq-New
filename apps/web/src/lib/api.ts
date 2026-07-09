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
      request<{ tokens: { accessToken: string; refreshToken: string }; user: { id: string; name: string; role: string; isSuperAdmin?: boolean }; tenant: { slug: string; name: string } }>(
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
    update: (id: string, data: Partial<Project>) =>
      request<Project>(`/api/v1/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/api/v1/projects/${id}`, { method: 'DELETE' }),
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
    list: (params?: { search?: string; page?: number; includeInactive?: boolean }) => {
      const q = new URLSearchParams(params as never).toString()
      return request<{ machines: Machine[]; total: number; page: number; pages: number }>(
        `/api/v1/machines${q ? `?${q}` : ''}`
      )
    },
    create: (data: Partial<Machine>) =>
      request<Machine>('/api/v1/machines', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Machine>) =>
      request<Machine>(`/api/v1/machines/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/v1/machines/${id}`, { method: 'DELETE' }),
  },

  cuttingParams: {
    list: (params?: { search?: string; machineType?: string; materialType?: string; page?: number }) => {
      const q = new URLSearchParams(params as never).toString()
      return request<{ params: CuttingParam[]; total: number; page: number; pages: number }>(
        `/api/v1/cutting-params/list${q ? `?${q}` : ''}`
      )
    },
    create: (data: Partial<CuttingParam>) =>
      request<CuttingParam>('/api/v1/cutting-params', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<CuttingParam>) =>
      request<CuttingParam>(`/api/v1/cutting-params/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/v1/cutting-params/${id}`, { method: 'DELETE' }),
  },

  materials: {
    list: (params?: { search?: string; page?: number; includeInactive?: boolean }) => {
      const q = new URLSearchParams(params as never).toString()
      return request<{ materials: Material[]; total: number; page: number; pages: number } | Material[]>(
        `/api/v1/materials${q ? `?${q}` : ''}`
      )
    },
    create: (data: Partial<Material>) =>
      request<Material>('/api/v1/materials', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Material>) =>
      request<Material>(`/api/v1/materials/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/v1/materials/${id}`, { method: 'DELETE' }),
  },

  operators: {
    list: () => request<Operator[]>('/api/v1/operators'),
    get:  (id: string) => request<Operator>(`/api/v1/operators/${id}`),
  },

  requesters: {
    list: () => request<Requester[]>('/api/v1/requesters'),
    create: (data: Partial<Requester>) => request<Requester>('/api/v1/requesters', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Requester>) => request<Requester>(`/api/v1/requesters/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/v1/requesters/${id}`, { method: 'DELETE' }),
  },

  dashboard: {
    stats: () => request<{
      orders: { total: number; pending: number; inProgress: number; completed: number; invoiced: number; createdToday: number; createdMonth: number }
      financial: { revenueMonth: number; revenueLastMonth: number; revenueGrowth: number | null; invoicedThisMonth: number; pendingInvoices: number }
    }>('/api/v1/dashboard/stats'),
  },

  financial: {
    list: (params?: { status?: string; page?: number; from?: string; to?: string }) => {
      const q = new URLSearchParams(params as never).toString()
      return request<FinancialResponse>(`/api/v1/financial${q ? `?${q}` : ''}`)
    },
    stats: () => request<FinancialStats>('/api/v1/financial/stats'),
    approve: (id: string, data: { costValue?: number; notes?: string; type?: string }) =>
      request<InvoicingRecord>(`/api/v1/financial/${id}/approve`, { method: 'PATCH', body: JSON.stringify(data) }),
    cancel: (id: string) =>
      request<{ ok: boolean }>(`/api/v1/financial/${id}/cancel`, { method: 'PATCH', body: JSON.stringify({}) }),
    calculate: (id: string) =>
      request<{ suggestedValue: number; breakdown: { stageNumber: number; machineType: string; machineName: string; minutes: number; cost: number }[]; hasParams: boolean }>(
        `/api/v1/financial/${id}/calculate`
      ),
  },

  users: {
    list: () => request<AppUser[]>('/api/v1/users'),
    get:  (id: string) => request<AppUser>(`/api/v1/users/${id}`),
    create: (data: { name: string; email: string; password: string; role: string }) =>
      request<AppUser>('/api/v1/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ name: string; email: string; role: string; isActive: boolean }>) =>
      request<AppUser>(`/api/v1/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    resetPassword: (id: string, password: string) =>
      request(`/api/v1/users/${id}/password`, { method: 'PATCH', body: JSON.stringify({ password }) }),
    toggle: (id: string) => request<{ id: string; isActive: boolean }>(`/api/v1/users/${id}`, { method: 'DELETE' }),
  },

  settings: {
    getOrderNumbering: () => request<{ config: Record<string, unknown>; preview: string }>('/api/v1/settings/order-numbering'),
    saveOrderNumbering: (data: Record<string, unknown>) =>
      request<{ config: Record<string, unknown>; preview: string }>('/api/v1/settings/order-numbering', { method: 'PATCH', body: JSON.stringify(data) }),
  },

  whatsapp: {
    connect: () =>
      request<{ instance: string; state: string; qrcode: string | null; pairingCode: string | null }>(
        '/api/v1/settings/whatsapp/connect', { method: 'POST' }
      ),
    state: () =>
      request<{ instance: string | null; state: string; connected: boolean }>('/api/v1/settings/whatsapp/state'),
    disconnect: () =>
      request<{ ok: boolean }>('/api/v1/settings/whatsapp/disconnect', { method: 'POST' }),
  },

  reports: {
    get: (from: string, to: string) =>
      request<any>(`/api/v1/reports?from=${from}&to=${to}`),
  },

  billing: {
    status: () => request<BillingStatus>('/api/v1/billing'),
    plans: () => request<{ plans: BillingPlan[] }>('/api/v1/billing/plans'),
    checkout: (plan: 'starter' | 'pro' | 'factory') =>
      request<{ url: string }>('/api/v1/billing/checkout', { method: 'POST', body: JSON.stringify({ plan }) }),
    portal: () => request<{ url: string }>('/api/v1/billing/portal', { method: 'POST' }),
  },

  notifications: {
    badge: () => request<{ pendingOrders: number; recentNotifications: number; total: number }>('/api/v1/notifications/badge'),
    status: () => request<{ email: { configured: boolean; from: string | null; provider: string }; whatsapp: { configured: boolean; apiUrl: string | null; provider: string } }>('/api/v1/notifications/status'),
    sendTestEmail: (to: string) => request('/api/v1/notifications/test-email', { method: 'POST', body: JSON.stringify({ to }) }),
  },

  nesting: {
    calculate: (orderId: string, data: { sheetWidthMm: number; sheetLengthMm: number; gapMm: number }) =>
      request<NestingJob>(`/api/v1/orders/${orderId}/nesting`, { method: 'POST', body: JSON.stringify(data) }),
    get: (orderId: string) =>
      request<NestingJob>(`/api/v1/orders/${orderId}/nesting`),
  },

  batches: {
    kanban: (machineId?: string) =>
      request<{ planned: any[]; in_progress: any[]; completed: any[] }>(
        `/api/v1/batches/kanban${machineId ? `?machineId=${machineId}` : ''}`
      ),
    list: (params?: { status?: string; machineId?: string }) => {
      const q = new URLSearchParams(params as any).toString()
      return request<any[]>(`/api/v1/batches${q ? `?${q}` : ''}`)
    },
    get: (id: string) => request<any>(`/api/v1/batches/${id}`),
    create: (data: any) => request<any>('/api/v1/batches', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/api/v1/batches/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/v1/batches/${id}`, { method: 'DELETE' }),
    updateStatus: (id: string, status: string) => request<any>(`/api/v1/batches/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    addOrders: (id: string, orderIds: string[]) => request<any>(`/api/v1/batches/${id}/orders`, { method: 'POST', body: JSON.stringify({ orderIds }) }),
    removeOrder: (id: string, orderId: string) => request(`/api/v1/batches/${id}/orders/${orderId}`, { method: 'DELETE' }),
    unassigned: () => request<any[]>('/api/v1/batches/orders/unassigned'),
  },

}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Client {
  id: string; name: string; taxId?: string; email?: string; phone?: string; address?: string
}
export interface Project {
  id: string; code: string; name: string; description?: string; status: string; clientId: string
  client?: { name: string }; createdAt?: string
}
export interface Machine {
  id: string; name: string; type: string; model?: string; serial?: string; isActive?: boolean
  costPerHour?: number | null; minBilledMinutes?: number | null
  costPerMinAfterMin?: number | null; materialCostEnabled?: boolean; marginPercent?: number | null
}
export interface Material { id: string; name: string; type: string; isActive?: boolean; costPerKg?: number | null; costPerM2?: number | null }
export interface CuttingParam {
  id: string; materialType: string; thicknessMm: number; machineType: string
  speedMmMin?: number | null; powerPercent?: number | null; gasPressureBar?: number | null
  gasType?: string | null; nozzleMm?: number | null; frequency?: number | null
  tonnageT?: number | null; bendAngleDeg?: number | null; bendRadiusMm?: number | null; backGaugeMm?: number | null
  bladeClearanceMm?: number | null; maxSheetThicknessMm?: number | null
  notes?: string | null; source?: string; confidence?: number; tenantId?: string | null; createdAt?: string
}
export interface Operator { id: string; name: string; username: string; phone?: string }
export interface Requester { id: string; name: string; email?: string; phone?: string; notifyWhatsapp?: boolean; notifyEmail?: boolean }
export interface OrderStage {
  id: string; stageNumber: number; type: string; status: string
  operator?: { name: string }; machine?: { name: string }
  startedAt?: string; completedAt?: string; cuttingTime?: number; notes?: string
  photos?: { id: string; filename: string }[]
}
export interface OrderFile {
  id: string; originalName: string; storagePath: string; previewPath: string | null
  fileType: string | null; sizeBytes: number; processed: boolean
  areaM2: number | null; bboxWidthMm: number | null; bboxHeightMm: number | null
  perimeterMm: number | null
}
export interface OrderItem {
  id: string; description: string; thicknessMm: number; quantityPlanned: number
  widthMm?: number; heightMm?: number; material?: { name: string }
  notes?: string; projectId?: string; clientFreeText?: string
  project?: { id: string; name: string; code: string; client?: { name: string } }
  files?: OrderFile[]
}
export interface OrderSheet {
  id: string; origin: 'ours' | 'offcut' | 'client'
  widthMm?: number; lengthMm?: number; thicknessMm?: number
  material?: { name: string }
}
export interface Order {
  id: string; orderNumber: string; status: string; authCode: string; accessToken: string
  notes?: string; sheetBatch?: string; processes?: string[]
  requestedAt?: string; scheduledAt?: string; isUrgent?: boolean
  clientId?: string; projectId?: string
  client?: { name: string }; project?: { id: string; name: string; code: string }
  requester?: { name: string }
  stages: OrderStage[]; items?: OrderItem[]; sheets?: OrderSheet[]
  createdAt: string; completedAt?: string
  invoicing?: { id: string; status: string; type: string; costValue?: number; noInvoice?: boolean }
}
export interface OrdersResponse { orders: Order[]; total: number; page: number; pages: number }
export interface InvoicingRecord {
  id: string
  status: 'pending' | 'invoiced' | 'cancelled'
  type: 'material_and_labor' | 'labor_only'
  costValue?: number
  invoiceDate?: string
  notes?: string
  createdAt: string
  serviceOrder: {
    id: string
    orderNumber: string
    status: string
    completedAt?: string
    client: { name: string }
    project: { name: string; code: string }
    stages: { cuttingTime?: number }[]
  }
}
export interface FinancialResponse { records: InvoicingRecord[]; total: number; page: number; pages: number }
export interface FinancialStats {
  pendingCount: number
  invoicedThisMonth: number
  revenueThisMonth: number
  revenueLastMonth: number
  revenueGrowth: number | null
  revenueTotal: number
}

export interface NestingJob {
  id: string
  sheetsNeeded: number
  utilizationPct: number
  unplacedPieces: number
  piecesCount: number
  piecesPerSheet: number
  previewUrl: string | null
  layout: Array<{ sheet: number; x: number; y: number; w: number; h: number; label: string; id: string }>
  sheetWidthMm: number
  sheetLengthMm: number
  gapMm: number
  createdAt?: string
}

export interface BillingStatus {
  plan: string
  planLabel: string
  planPrice: string
  planExpiresAt: string | null
  planExpired: boolean
  trial: { isTrialPlan: boolean; daysLeft: number | null; expiresAt: string | null; expired: boolean }
  usage: Record<string, { current: number; limit: number | null; unlimited: boolean }>
}
export interface BillingPlan {
  id: 'starter' | 'pro' | 'factory'
  label: string
  price: number
  priceId: string
  features: string[]
}

export interface AppUser {
  id: string; name: string; email: string
  role: 'admin' | 'financial' | 'requester' | 'viewer'
  isActive: boolean; lastLoginAt?: string; createdAt: string
}
