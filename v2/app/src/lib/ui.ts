// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import Swal from 'sweetalert2'
import { toast } from 'sonner'

const SWAL_THEME = {
  background: '#0f172a',
  color: '#f1f5f9',
  confirmButtonColor: '#f59e0b',
  cancelButtonColor: '#334155',
}

export async function confirmDialog(message: string, title = 'Confirmar'): Promise<boolean> {
  const result = await Swal.fire({
    title,
    text: message,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sim',
    cancelButtonText: 'Cancelar',
    ...SWAL_THEME,
  })
  return result.isConfirmed
}

export const notifySuccess = (message: string) => toast.success(message)
export const notifyError = (message: string) => toast.error(message)
