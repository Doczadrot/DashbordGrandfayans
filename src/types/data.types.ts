export interface DefectRecord {
  id: string;
  nomenclature: string;
  personalNumber: string;
  claimReason: string;
  defectDescription: string;
  supplier: string;
  responsibility: string; // Ответственность за брак
  warehouse: string; // Склад обнаружения
  defectType: string; // Вид дефекта
  date: string;
  reportMonth: string;
  quantity: number;
  fileName?: string;
  originalClaimReason?: string;
}

export interface ParetoItem {
  reason: string;
  count: number;
  percentage: number;
  cumulativePercentage: number;
  breakdown?: Record<string, number>;
}

export interface SupplierKPI {
  supplier: string;
  totalDefects: number;
  defectPercentage: number;
}

export interface DashboardStats {
  totalDefects: number;
  topReason: string;
  topSupplier: string;
}

export interface RawDataRow {
  'Номенклатура': string;
  'Персональный номер': string;
  'Причина претензии': string;
  'Описание дефекта': string;
  'Поставщик': string;
  'Ответственность за брак': string;
  'Склад обнаружения': string;
  'Вид дефекта': string;
  [key: string]: unknown;
}

export interface SalesRecord {
  month: string;
  quantity: number;
  fileName?: string;
  nomenclature?: string;
  supplier?: string;
}

export interface ReportData {
  records: DefectRecord[];
  sales?: SalesRecord[];
  fileName: string;
  reportMonth: string;
}
