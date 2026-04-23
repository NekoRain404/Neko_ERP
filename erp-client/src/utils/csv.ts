export interface ParsedCsvData {
  headers: string[]
  rows: Array<Record<string, string>>
}

export function parseCsvText(rawText: string): ParsedCsvData {
  const rows = splitCsvRows(String(rawText || '').replace(/^\uFEFF/, ''))
  if (!rows.length) {
    return {
      headers: [],
      rows: [],
    }
  }

  const headers = rows[0].map((cell) => String(cell || '').trim()).filter(Boolean)
  const body = rows.slice(1).map((row) => {
    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      record[header] = String(row[index] ?? '')
    })
    return record
  })

  return {
    headers,
    rows: body,
  }
}

export function decodeBase64Utf8(base64: string) {
  const binary = window.atob(String(base64 || ''))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

function splitCsvRows(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && char === ',') {
      row.push(cell)
      cell = ''
      continue
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      row.push(cell)
      cell = ''
      if (char === '\r' && next === '\n') {
        index += 1
      }
      if (!row.every((item) => item === '')) {
        rows.push(row)
      }
      row = []
      continue
    }

    cell += char
  }

  if (cell !== '' || row.length) {
    row.push(cell)
    if (!row.every((item) => item === '')) {
      rows.push(row)
    }
  }

  return rows
}
