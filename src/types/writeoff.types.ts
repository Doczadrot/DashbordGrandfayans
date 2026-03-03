export interface WriteOffItem {
  nomenclature: string;
  quantity: number;
  sum: number;
  personalNumber: string;
  writeOffReason: string; // "Причина претензии" (Col F)
  defectSource?: string; // "Источник дефекта" (Col E)
  supplier?: string; // "Поставщик" (Col G)
  docReason?: string; // "Причина списания" (Col A from Group Header)
  writeOffDocument?: string; // "Документ списания"
  writeOffDate?: string; // Дата из документа списания (DD.MM.YYYY)
  writeOffMonth?: string; // Месяц списания (например "Январь 2026")
  warehouse?: string; // Склад
  isFactoryDefect?: boolean; // Является ли заводским браком
}

export interface WriteOffGroup {
  reason: string; // From the group header (e.g. "Дефект литья")
  totalQuantity: number;
  totalSum: number;
  items: WriteOffItem[];
}

export interface WriteOffFile {
  id: string;
  filename: string;
  period: string; // e.g. "01.12.2025 - 31.12.2025"
  groups: WriteOffGroup[];
}
