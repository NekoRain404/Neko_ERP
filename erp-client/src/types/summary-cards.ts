export interface SummaryCardItem {
  key: string
  label: string
  value: string
  description: string
  tone?: 'default' | 'success' | 'warning' | 'danger'
}
