// src/types/arrival.types.ts

export interface ArrivalDocument {
    id: string;           // Номер документа типа ГФУТ-005173
    date: string;         // Дата документа
    quantity: number;
    volume: number;
  }
  
  export interface ArrivalSupplier {
    supplier: string;
    totalQuantity: number;
    totalVolume: number;
    documents: ArrivalDocument[];
  }
  
  export interface ArrivalFile {
    id: string;
    filename: string;
    period: string;       // "01.12.2025 - 31.12.2025"
    warehouse: string;    // "Импорт в пути"
    suppliers: ArrivalSupplier[];
    totalQuantity: number;
    totalVolume: number;
  }