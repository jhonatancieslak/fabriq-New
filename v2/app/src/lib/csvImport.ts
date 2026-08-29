// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import Papa from 'papaparse'

export interface ParsedRow<T> {
  line: number
  raw: Record<string, string>
  value: T | null
  error: string | null
}

export function parseCsvFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (results) => resolve(results.data),
      error: reject,
    })
  })
}

export function downloadCsvTemplate(filename: string, headers: string[], exampleRow: string[]) {
  const csv = Papa.unparse({ fields: headers, data: [exampleRow] })
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
