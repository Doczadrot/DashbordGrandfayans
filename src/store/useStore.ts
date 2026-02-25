import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DefectRecord, SalesRecord } from '../types/data.types';
import { WriteOffFile } from '../types/writeoff.types';
import { classifySupplier } from '../utils/supplierClassification';

export interface SupplierGroups {
  china: string[];
  rf: string[];
  furniture: string[];
}

interface AppState {
  data: DefectRecord[];
  salesData: SalesRecord[];
  writeOffData: WriteOffFile[];
  meta: {
    fileName: string;
    reportMonth: string;
  };
  supplierGroups: SupplierGroups;
  setData: (data: DefectRecord[]) => void;
  addData: (newData: DefectRecord[]) => void;
  addSalesData: (newSales: SalesRecord[]) => void;
  addWriteOffFile: (file: WriteOffFile) => void;
  resetWriteOffData: () => void;
  setMeta: (meta: { fileName: string; reportMonth: string }) => void;
  updateMeta: (newMeta: Partial<{ fileName: string; reportMonth: string }>) => void;
  updateSupplierGroup: (group: keyof SupplierGroups, suppliers: string[]) => void;
  loadState: (state: Partial<AppState>) => void;
  autoClassifySuppliers: () => void;
  resetStore: () => void;
  resetSalesData: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      data: [],
      salesData: [],
      writeOffData: [],
      meta: { fileName: '', reportMonth: '' },
      supplierGroups: {
        china: [],
        rf: [],
        furniture: [],
      },
      setData: (data) => {
        console.log("STORE: Setting data, count:", data.length);
        set({ data });
      },
      addData: (newData) => {
        console.log("STORE: Adding data, count:", newData.length);
        set((state) => ({ data: [...state.data, ...newData] }));
      },
      addSalesData: (newSales) => {
        console.log("STORE: Adding sales data, count:", newSales.length);
        set((state) => {
            // Deduplicate based on month, nomenclature, supplier, and quantity
            // to avoid doubling the same file content if uploaded twice
            const existingSales = state.salesData;
            const uniqueNewSales = newSales.filter(ns => 
                !existingSales.some(es => 
                    es.month === ns.month && 
                    es.nomenclature === ns.nomenclature && 
                    es.supplier === ns.supplier && 
                    es.quantity === ns.quantity
                )
            );
            
            if (uniqueNewSales.length === 0) {
                console.log("STORE: All new sales data are duplicates, skipping.");
                return state;
            }
            
            return { salesData: [...state.salesData, ...uniqueNewSales] };
        });
      },
      addWriteOffFile: (file) => {
        console.log("STORE: Adding write-off file:", file.filename, "groups:", file.groups.length);
        set((state) => ({ writeOffData: [...state.writeOffData, file] }));
      },
      resetWriteOffData: () => {
        console.log("STORE: Resetting write-off data");
        set({ writeOffData: [] });
      },
      setMeta: (meta) => {
        console.log("STORE: Setting meta:", meta);
        set({ meta });
      },
      updateMeta: (newMeta) => {
        console.log("STORE: Updating meta:", newMeta);
        set((state) => ({ meta: { ...state.meta, ...newMeta } }));
      },
      resetStore: () => {
        console.log("STORE: Resetting entire store");
        set({ data: [], salesData: [], writeOffData: [], meta: { fileName: '', reportMonth: '' }, supplierGroups: { china: [], rf: [], furniture: [] } });
      },
      resetSalesData: () => {
        console.log("STORE: Resetting only sales data");
        set({ salesData: [] });
      },
      loadState: (newState) => {
        console.log("STORE: Loading state partial");
        set((state) => ({ ...state, ...newState }));
      },
      updateSupplierGroup: (group, suppliers) => {
        console.log("STORE: Updating supplier group:", group, "count:", suppliers.length);
        set((state) => ({
          supplierGroups: {
            ...state.supplierGroups,
            [group]: suppliers,
          },
        }));
      },
      autoClassifySuppliers: () => {
        console.log("STORE: Starting auto-classification of suppliers...");
        const { data } = get();
        const suppliers = Array.from(new Set(data.map((d) => d.supplier).filter(Boolean)));
        console.log("STORE: Unique suppliers found:", suppliers.length);
        
        const newGroups: SupplierGroups = {
          china: [],
          rf: [],
          furniture: [],
        };

        suppliers.forEach((supplier) => {
          const supplierRecords = data.filter((d) => d.supplier === supplier);
          const category = classifySupplier(supplier, supplierRecords);
          
          if (category === 'china') {
            newGroups.china.push(supplier);
          } else if (category === 'furniture') {
            newGroups.furniture.push(supplier);
          } else {
            newGroups.rf.push(supplier);
          }
        });

        console.log("STORE: Classification complete", {
            china: newGroups.china.length,
            rf: newGroups.rf.length,
            furniture: newGroups.furniture.length
        });
        set({ supplierGroups: newGroups });
      },
    }),
    {
      name: 'quality-dashboard-store',
      partialize: (state) => ({ supplierGroups: state.supplierGroups, writeOffData: state.writeOffData }), // Persist supplier groups AND writeOffData
    }
  )
);
