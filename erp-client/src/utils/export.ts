export interface CsvColumn<T> {
  key: keyof T | string
  title: string
  resolve?: (row: T) => string | number | boolean | null | undefined
}

export function downloadCsv<T>(filename: string, columns: CsvColumn<T>[], rows: T[]) {
  const header = columns.map((column) => escapeCsvCell(column.title)).join(',')
  const body = rows
    .map((row) =>
      columns
        .map((column) => {
          const raw = column.resolve ? column.resolve(row) : (row as any)?.[column.key as string]
          return escapeCsvCell(raw)
        })
        .join(','),
    )
    .join('\n')
  const csv = [header, body].filter(Boolean).join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(filename, blob)
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  downloadBlob(filename, blob)
}

export function downloadText(filename: string, content: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType })
  downloadBlob(filename, blob)
}

function downloadBlob(filename: string, blob: Blob) {
  if (typeof window !== 'undefined' && window.erpDesktop?.saveFile) {
    void saveBlobWithDesktop(filename, blob).catch(() => {
      fallbackDownloadBlob(filename, blob)
    })
    return
  }
  fallbackDownloadBlob(filename, blob)
}

async function saveBlobWithDesktop(filename: string, blob: Blob) {
  const desktopBridge = window.erpDesktop
  if (!desktopBridge?.saveFile) {
    fallbackDownloadBlob(filename, blob)
    return
  }
  const arrayBuffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  const result = await desktopBridge.saveFile({
    suggestedName: filename,
    dataBase64: window.btoa(binary),
    mimeType: blob.type,
  })
  if (!result?.canceled) return
}

function fallbackDownloadBlob(filename: string, blob: Blob) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? '')
  if (!/[",\n]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}
