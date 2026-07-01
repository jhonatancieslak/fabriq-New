// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
//
// Gestão de instâncias Evolution API (WhatsApp) por tenant, usando a apikey GLOBAL.
// Cada tenant tem a sua própria instância (fabriq-{tenantId}) e conecta escaneando o QR code.

export interface QrResult {
  base64?: string // data URI do QR code (PNG)
  code?: string   // pairing code (alternativa ao QR)
}

function baseUrl(): string {
  const url = process.env.EVOLUTION_API_URL
  if (!url) throw new Error('EVOLUTION_API_URL não configurado')
  return url
}

function headers(): Record<string, string> {
  const apiKey = process.env.EVOLUTION_API_KEY
  if (!apiKey) throw new Error('EVOLUTION_API_KEY não configurado')
  return { 'Content-Type': 'application/json', apikey: apiKey }
}

export const WhatsAppAdmin = {
  // Cria a instância (idempotente: se já existir, a Evolution retorna 403/409 → busca o QR actual).
  async createInstance(instanceName: string): Promise<QrResult> {
    const res = await fetch(`${baseUrl()}/instance/create`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ instanceName, qrcode: true }),
    })

    if (res.status === 403 || res.status === 409) {
      return this.connect(instanceName)
    }

    if (!res.ok) {
      throw new Error(`Evolution API: falha ao criar instância (${res.status})`)
    }

    const data = (await res.json()) as { qrcode?: { base64?: string; code?: string } }
    return { base64: data?.qrcode?.base64, code: data?.qrcode?.code }
  },

  // Retorna o QR actual (ou pairing code) para conectar a instância.
  async connect(instanceName: string): Promise<QrResult> {
    const res = await fetch(`${baseUrl()}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: headers(),
    })
    if (!res.ok) {
      throw new Error(`Evolution API: falha ao conectar instância (${res.status})`)
    }
    const data = (await res.json()) as { base64?: string; code?: string; pairingCode?: string }
    return { base64: data?.base64, code: data?.code ?? data?.pairingCode }
  },

  async connectionState(instanceName: string): Promise<string> {
    try {
      const res = await fetch(`${baseUrl()}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: headers(),
      })
      if (!res.ok) return 'close'
      const data = (await res.json()) as { instance?: { state?: string } }
      return data?.instance?.state ?? 'close'
    } catch {
      return 'close'
    }
  },

  async logout(instanceName: string): Promise<void> {
    try {
      await fetch(`${baseUrl()}/instance/logout/${instanceName}`, { method: 'DELETE', headers: headers() })
    } catch {
      // ignora erros
    }
  },

  async deleteInstance(instanceName: string): Promise<void> {
    try {
      await fetch(`${baseUrl()}/instance/delete/${instanceName}`, { method: 'DELETE', headers: headers() })
    } catch {
      // ignora erros
    }
  },
}
