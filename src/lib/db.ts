import Dexie, { type Table } from 'dexie';
import type { PRJNEntry } from '../types';

export class PRJNDatabase extends Dexie {
  entries!: Table<PRJNEntry>;

  constructor() {
    super('PRJNDatabase');
    this.version(1).stores({
      entries: 'id, category, createdAt'
    });
  }
}

export const db = new PRJNDatabase();
