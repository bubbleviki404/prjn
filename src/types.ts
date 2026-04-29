export type PRJNCategory = 'product' | 'tool' | 'workflow' | 'learning' | 'life' | 'growth';

export interface PRJNEntry {
  id: string;
  category: PRJNCategory;
  predict: string;
  reality: string;
  judgment: string;
  next: string;
  note?: string;
  createdAt: number;
}

export interface PRJNExport {
  version: string;
  exportedAt: string;
  entries: PRJNEntry[];
}
