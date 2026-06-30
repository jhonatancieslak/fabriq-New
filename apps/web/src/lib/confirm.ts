// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
// Utilitários de confirmação SweetAlert2 — tema FABRIQ.IA

import Swal from 'sweetalert2'

const base = {
  background: '#1C1D20',
  color: '#F9FAFB',
  confirmButtonColor: '#CA8A04',
  cancelButtonColor: '#374151',
  customClass: {
    popup: 'fabriq-swal-popup',
    confirmButton: 'fabriq-swal-confirm',
    cancelButton: 'fabriq-swal-cancel',
  },
}

/** Confirmação de apagar — retorna true se confirmado */
export async function confirmDelete(name: string, extra?: string): Promise<boolean> {
  const result = await Swal.fire({
    ...base,
    title: 'Tem a certeza?',
    html: `<p style="color:#9CA3AF;font-size:14px">Vai remover <strong style="color:#F9FAFB">${name}</strong>${extra ? `<br><span style="color:#EF4444;font-size:13px">${extra}</span>` : ''}</p>`,
    icon: 'warning',
    iconColor: '#EF4444',
    showCancelButton: true,
    confirmButtonText: 'Sim, remover',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
  })
  return result.isConfirmed
}

/** Confirmação de desactivar */
export async function confirmDisable(name: string): Promise<boolean> {
  const result = await Swal.fire({
    ...base,
    title: 'Desactivar?',
    html: `<p style="color:#9CA3AF;font-size:14px">Desactivar <strong style="color:#F9FAFB">${name}</strong>?<br><span style="color:#9CA3AF;font-size:13px">Poderá reactivar a qualquer momento.</span></p>`,
    icon: 'warning',
    iconColor: '#F59E0B',
    showCancelButton: true,
    confirmButtonText: 'Desactivar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
  })
  return result.isConfirmed
}

/** Confirmação de cancelar ordem */
export async function confirmCancel(label?: string): Promise<boolean> {
  const result = await Swal.fire({
    ...base,
    title: 'Cancelar ordem?',
    html: `<p style="color:#9CA3AF;font-size:14px">${label ?? 'Esta acção não pode ser desfeita.'}</p>`,
    icon: 'warning',
    iconColor: '#EF4444',
    showCancelButton: true,
    confirmButtonText: 'Sim, cancelar',
    confirmButtonColor: '#DC2626',
    cancelButtonText: 'Voltar',
    reverseButtons: true,
  })
  return result.isConfirmed
}

/** Confirmação de concluir etapa */
export async function confirmComplete(label?: string): Promise<boolean> {
  const result = await Swal.fire({
    ...base,
    title: 'Concluir etapa?',
    html: `<p style="color:#9CA3AF;font-size:14px">${label ?? 'Confirma a conclusão desta etapa?'}</p>`,
    icon: 'question',
    iconColor: '#22C55E',
    showCancelButton: true,
    confirmButtonText: 'Confirmar',
    confirmButtonColor: '#16A34A',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
  })
  return result.isConfirmed
}

/** Confirmação de desbloquear IP */
export async function confirmUnblock(ip: string): Promise<boolean> {
  const result = await Swal.fire({
    ...base,
    title: 'Desbloquear IP?',
    html: `<p style="color:#9CA3AF;font-size:14px">Desbloquear <strong style="color:#F9FAFB;font-family:monospace">${ip}</strong>?</p>`,
    icon: 'question',
    iconColor: '#22C55E',
    showCancelButton: true,
    confirmButtonText: 'Desbloquear',
    confirmButtonColor: '#16A34A',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
  })
  return result.isConfirmed
}

/** Confirmação de cancelar faturação */
export async function confirmCancelInvoice(): Promise<boolean> {
  const result = await Swal.fire({
    ...base,
    title: 'Cancelar faturação?',
    html: `<p style="color:#9CA3AF;font-size:14px">Esta acção não pode ser desfeita.</p>`,
    icon: 'warning',
    iconColor: '#EF4444',
    showCancelButton: true,
    confirmButtonText: 'Sim, cancelar',
    confirmButtonColor: '#DC2626',
    cancelButtonText: 'Voltar',
    reverseButtons: true,
  })
  return result.isConfirmed
}
