export interface ReferenceColumn {
  key: string;
  label: string;
  mono?: boolean;
}

export interface ReferenceEntry {
  columns: Record<string, string>;
}

export interface ReferenceTable {
  id: string;
  title: string;
  description: string;
  columnHeaders: ReferenceColumn[];
  entries: ReferenceEntry[];
}
