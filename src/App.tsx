/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { nanoid } from 'nanoid';
import { format } from 'date-fns';
import { 
  Plus, 
  Download, 
  ClipboardList,
  Pencil,
  Upload,
  X,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from './lib/db';
import { cn } from './lib/utils';
import type { PRJNEntry, PRJNCategory, PRJNExport } from './types';

const CATEGORIES: PRJNCategory[] = ['product', 'tool', 'workflow', 'learning', 'life', 'growth'];

const CATEGORY_MAP: Record<PRJNCategory, string> = {
  product: '产品',
  tool: '工具',
  workflow: '工作流',
  learning: '学习',
  life: '生活',
  growth: '成长'
};

type ParsedPRJN = {
  category?: string;
  predict?: string;
  reality?: string;
  judgment?: string;
  next?: string;
  note?: string;
};

type PRJNDraft = Omit<PRJNEntry, 'id' | 'createdAt'>;

const FIELD_MAP: Record<string, keyof ParsedPRJN> = {
  category: 'category',
  p: 'predict',
  r: 'reality',
  j: 'judgment',
  n: 'next',
  note: 'note'
};

function isPRJNCategory(value: string): value is PRJNCategory {
  return CATEGORIES.includes(value as PRJNCategory);
}

function parsePRJNText(text: string): ParsedPRJN {
  const parsed: ParsedPRJN = {};
  let currentField: keyof ParsedPRJN | null = null;

  text.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*(Category|P|R|J|N|Note)\s*[:：]\s*(.*)$/i);

    if (match) {
      currentField = FIELD_MAP[match[1].toLowerCase()];
      parsed[currentField] = match[2].trim();
      return;
    }

    if (currentField && line.trim()) {
      parsed[currentField] = [parsed[currentField], line.trim()].filter(Boolean).join('\n');
    }
  });

  return parsed;
}

function draftFromParsed(parsed: ParsedPRJN, fallbackCategory: PRJNCategory): { draft: PRJNDraft; categoryMessage?: string } {
  const normalizedCategory = parsed.category?.trim().toLowerCase();
  const parsedCategory = normalizedCategory && isPRJNCategory(normalizedCategory) ? normalizedCategory : fallbackCategory;

  return {
    draft: {
      category: parsedCategory,
      predict: parsed.predict ?? '',
      reality: parsed.reality ?? '',
      judgment: parsed.judgment ?? '',
      next: parsed.next ?? '',
      note: parsed.note?.trim() || undefined,
    },
    categoryMessage: parsed.category && parsedCategory === fallbackCategory && normalizedCategory !== fallbackCategory
      ? `分类 "${parsed.category}" 不在当前范围内，已使用 ${fallbackCategory}`
      : undefined,
  };
}

function isDraftReady(draft: PRJNDraft | null): draft is PRJNDraft {
  return Boolean(draft?.predict && draft.reality && draft.judgment && draft.next);
}

function normalizeImportedEntry(entry: unknown): PRJNEntry | null {
  if (!entry || typeof entry !== 'object') return null;

  const source = entry as Partial<PRJNEntry>;

  if (
    typeof source.predict !== 'string' ||
    typeof source.reality !== 'string' ||
    typeof source.judgment !== 'string' ||
    typeof source.next !== 'string'
  ) {
    return null;
  }

  return {
    id: typeof source.id === 'string' && source.id ? source.id : nanoid(),
    category: typeof source.category === 'string' && isPRJNCategory(source.category) ? source.category : 'learning',
    predict: source.predict,
    reality: source.reality,
    judgment: source.judgment,
    next: source.next,
    note: typeof source.note === 'string' && source.note.trim() ? source.note : undefined,
    createdAt: typeof source.createdAt === 'number' ? source.createdAt : Date.now(),
  };
}

export default function App() {
  // Form State
  const [category, setCategory] = useState<PRJNCategory>('learning');
  const [predict, setPredict] = useState('');
  const [reality, setReality] = useState('');
  const [judgment, setJudgment] = useState('');
  const [next, setNext] = useState('');
  const [note, setNote] = useState('');
  const [quickAddText, setQuickAddText] = useState('');
  const [quickAddDraft, setQuickAddDraft] = useState<PRJNDraft | null>(null);
  const [quickAddMessage, setQuickAddMessage] = useState('');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<(PRJNDraft & { id: string }) | null>(null);
  const [leftPaneWidth, setLeftPaneWidth] = useState(400);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const importInputRef = useRef<HTMLInputElement>(null);

  // Data Fetching
  const history = useLiveQuery(
    () => db.entries.orderBy('createdAt').reverse().toArray()
  );

  // Actions
  const resetForm = () => {
    setPredict('');
    setReality('');
    setJudgment('');
    setNext('');
    setNote('');
    setIsNoteOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!predict || !reality || !judgment || !next) {
      alert('请填写完整的 PRJN 信息');
      return;
    }

    setIsSaving(true);
    try {
      const newEntry: PRJNEntry = {
        id: nanoid(),
        category,
        predict,
        reality,
        judgment,
        next,
        note: note.trim() || undefined,
        createdAt: Date.now(),
      };

      await db.entries.add(newEntry);

      resetForm();
    } catch (error) {
      console.error('Failed to save PRJN:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingIds.has(id)) return;

    setDeletingIds(prev => new Set(prev).add(id));
    
    try {
      await db.entries.delete(id);
      if (editingEntry?.id === id) {
        setEditingEntry(null);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      setDeletingIds(prev => {
        const nextSet = new Set(prev);
        nextSet.delete(id);
        return nextSet;
      });
    }
  };

  const handleQuickAddParse = () => {
    if (!quickAddText.trim()) {
      setQuickAddDraft(null);
      setQuickAddMessage('请先粘贴 PRJN 文本 / Paste PRJN text first');
      return;
    }

    const parsed = parsePRJNText(quickAddText);
    const recognizedFields = Object.values(parsed).filter((value) => value?.trim()).length;

    if (recognizedFields === 0) {
      setQuickAddDraft(null);
      setQuickAddMessage('未识别到可生成卡片的字段 / Nothing parsed');
      return;
    }

    const { draft, categoryMessage } = draftFromParsed(parsed, category);
    setQuickAddDraft(draft);
    setQuickAddMessage(categoryMessage ?? '已识别为预览卡片，请确认后添加 / Preview ready');
  };

  const resetQuickAdd = () => {
    setQuickAddText('');
    setQuickAddDraft(null);
    setQuickAddMessage('');
  };

  const handleQuickAddConfirm = async () => {
    if (!isDraftReady(quickAddDraft)) {
      setQuickAddMessage('P/R/J/N 需要完整后才能添加 / P/R/J/N required');
      return;
    }

    try {
      await db.entries.add({
        ...quickAddDraft,
        id: nanoid(),
        createdAt: Date.now(),
      });
      resetQuickAdd();
      setIsQuickAddOpen(false);
    } catch (error) {
      console.error('Quick add failed:', error);
      setQuickAddMessage('添加失败，请重试 / Add failed');
    }
  };

  const handleQuickAddDraftChange = (field: keyof PRJNDraft, value: string | PRJNCategory) => {
    setQuickAddDraft((current) => current ? { ...current, [field]: value } : current);
  };

  const handleEdit = (entry: PRJNEntry) => {
    setEditingEntry({
      id: entry.id,
      category: entry.category,
      predict: entry.predict,
      reality: entry.reality,
      judgment: entry.judgment,
      next: entry.next,
      note: entry.note,
    });
    setIsQuickAddOpen(false);
  };

  const handleEditFieldChange = (field: keyof PRJNDraft, value: string | PRJNCategory) => {
    setEditingEntry((current) => current ? { ...current, [field]: value } : current);
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry) return;
    if (!editingEntry.predict || !editingEntry.reality || !editingEntry.judgment || !editingEntry.next) {
      alert('请填写完整的 PRJN 信息');
      return;
    }

    try {
      await db.entries.update(editingEntry.id, {
        category: editingEntry.category,
        predict: editingEntry.predict,
        reality: editingEntry.reality,
        judgment: editingEntry.judgment,
        next: editingEntry.next,
        note: editingEntry.note?.trim() || undefined,
      });
      setEditingEntry(null);
    } catch (error) {
      console.error('Update failed:', error);
      alert('更新失败，请重试');
    }
  };

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = event.currentTarget.parentElement;
    if (!container) return;

    const bounds = container.getBoundingClientRect();
    const minWidth = 320;
    const maxWidth = Math.max(minWidth, bounds.width - 420);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.min(Math.max(moveEvent.clientX - bounds.left, minWidth), maxWidth);
      setLeftPaneWidth(nextWidth);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleExport = () => {
    if (!history || history.length === 0) {
      alert('没有可导出的数据');
      return;
    }

    const exportData: PRJNExport = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      entries: history,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PRJN_Export_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    try {
      const content = await file.text();
      const data = JSON.parse(content) as Partial<PRJNExport>;
      const importedEntries = Array.isArray(data.entries)
        ? data.entries.map(normalizeImportedEntry).filter((entry): entry is PRJNEntry => Boolean(entry))
        : [];

      if (importedEntries.length === 0) {
        alert('没有识别到可导入的 PRJN 记录');
        return;
      }

      await db.entries.bulkPut(importedEntries);
      alert(`已导入 ${importedEntries.length} 条 PRJN 记录`);
    } catch (error) {
      console.error('Import failed:', error);
      alert('导入失败，请确认 JSON 文件格式正确');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden font-sans">
      {/* Header */}
      <header className="px-8 py-6 border-b border-gray-200 bg-white flex justify-between items-center flex-shrink-0 z-10">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-black flex items-center gap-2">
            <span className="bg-black text-white px-1.5 py-0.5 rounded leading-none">PRJN</span>
            <span className="text-gray-400 font-light translate-y-[-1px]">/</span>
            复盘框架
          </h1>
          <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-bold">
            4 Questions • 留住经验 • 更新判断 • 指导下一步
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsQuickAddOpen(true)}
            className="text-[10px] font-bold px-3 py-2 bg-black text-white rounded-md hover:opacity-90 transition-colors flex items-center gap-2 tracking-widest uppercase"
          >
            <Plus size={12} />
            快速新增 / QUICK ADD
          </button>
          <button 
            onClick={() => importInputRef.current?.click()}
            className="text-[10px] font-bold px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 tracking-widest uppercase"
          >
            <Upload size={12} />
            数据导入 / IMPORT
          </button>
          <button 
            onClick={handleExport}
            className="text-[10px] font-bold px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 tracking-widest uppercase"
          >
            <Download size={12} />
            数据导出 / EXPORT
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Pane: Input Form */}
        <section
          className="w-full md:w-[var(--left-pane-width)] md:min-w-[320px] md:max-w-[70vw] border-b md:border-b-0 border-gray-200 bg-white p-8 flex flex-col overflow-y-auto custom-scrollbar"
          style={{ '--left-pane-width': `${leftPaneWidth}px` } as React.CSSProperties}
        >
          <div className="mb-8">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 block">1. 分类 / Select Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "category-btn-minimal",
                    category === cat && "category-btn-minimal-active"
                  )}
                >
                  <span className="block text-[9px] font-bold opacity-60">{cat.toUpperCase()}</span>
                  <span className="block mt-0.5">{CATEGORY_MAP[cat]}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6 flex-1 flex flex-col">
            <div className="space-y-4">
              <MinimalField char="P" color="text-blue-600" focusBorder="focus:border-blue-500">
                <textarea
                  value={predict}
                  onChange={(e) => setPredict(e.target.value)}
                  placeholder="Predict | 我原本以为... (预期与假设)"
                  className="prjn-input-minimal"
                />
              </MinimalField>

              <MinimalField char="R" color="text-orange-600" focusBorder="focus:border-orange-500">
                <textarea
                  value={reality}
                  onChange={(e) => setReality(e.target.value)}
                  placeholder="Reality | 实际发生... (结果与偏差)"
                  className="prjn-input-minimal"
                />
              </MinimalField>

              <MinimalField char="J" color="text-purple-600" focusBorder="focus:border-purple-500">
                <textarea
                  value={judgment}
                  onChange={(e) => setJudgment(e.target.value)}
                  placeholder="Judgment | 我现在判断... (新认知与反思)"
                  className="prjn-input-minimal"
                />
              </MinimalField>

              <MinimalField char="N" color="text-green-600" focusBorder="focus:border-green-500">
                <textarea
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  placeholder="Next | 下一步... (具体行动计划)"
                  className="prjn-input-minimal"
                />
              </MinimalField>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsNoteOpen(!isNoteOpen)}
                  className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter flex items-center gap-1 hover:text-gray-600 transition-colors"
                >
                  <Plus size={12} strokeWidth={3} />
                  {isNoteOpen ? '隐藏备注 / Hide' : '添加备注 / Add optional note'}
                </button>
                <AnimatePresence>
                  {isNoteOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="细节背景或补充..."
                        className="prjn-input-minimal mt-2 h-12 text-xs"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full mt-auto bg-black text-white py-4 rounded-xl font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? '正在保存 / SAVING...' : '保存复盘 / SAVE ENTRY'}
            </button>
          </form>
        </section>

        <div
          role="separator"
          aria-label="调整输入区和历史区宽度 / Resize panes"
          className="hidden md:flex w-2 cursor-col-resize items-center justify-center bg-white border-x border-gray-200 hover:bg-gray-100 active:bg-gray-200 transition-colors group"
          onPointerDown={handleResizeStart}
        >
          <div className="h-10 w-0.5 rounded-full bg-gray-200 group-hover:bg-gray-400 transition-colors" />
        </div>

        {/* Right Pane: History */}
        <section className="flex-1 bg-gray-50 p-8 flex flex-col overflow-hidden">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">历史复盘 / Recent Entries</h2>
            <span className="text-[10px] text-gray-400 font-mono">
              {history?.length || 0} 条记录 / RECORDS
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
            <AnimatePresence mode="popLayout">
              {history?.map((entry) => (
                <HistoryCard 
                  key={entry.id} 
                  entry={entry} 
                  onEdit={handleEdit}
                  onDelete={handleDelete} 
                  isDeleting={deletingIds.has(entry.id)} 
                  isEditing={editingEntry?.id === entry.id}
                />
              ))}
            </AnimatePresence>
            
            {history?.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20 grayscale">
                <ClipboardList size={48} strokeWidth={1} />
                <div className="space-y-1">
                  <p className="text-sm font-bold uppercase tracking-widest">目前还没有记录 / No entries yet</p>
                  <p className="text-[10px] font-medium tracking-tight uppercase">在左侧开始你的第一次复盘 / Start your first reflection</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <AnimatePresence>
        {editingEntry && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              className="max-h-[88vh] overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-200 custom-scrollbar"
              style={{ width: 'min(96vw, 1120px)' }}
            >
              <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest">编辑 PRJN / Edit Entry</h2>
                  <p className="text-[11px] text-gray-400 mt-1">
                    修改后点击更新才会写回历史记录。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="p-2 rounded-md text-gray-400 hover:bg-gray-100 hover:text-black transition-colors"
                  title="关闭 / Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">分类 / Category</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleEditFieldChange('category', cat)}
                        className={cn(
                          "category-btn-minimal",
                          editingEntry.category === cat && "category-btn-minimal-active"
                        )}
                      >
                        <span className="block text-[9px] font-bold opacity-60">{cat.toUpperCase()}</span>
                        <span className="block mt-0.5">{CATEGORY_MAP[cat]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditField label="P / Predict" color="text-blue-500">
                    <textarea
                      value={editingEntry.predict}
                      onChange={(e) => handleEditFieldChange('predict', e.target.value)}
                      className="prjn-edit-input"
                    />
                  </EditField>
                  <EditField label="R / Reality" color="text-orange-500">
                    <textarea
                      value={editingEntry.reality}
                      onChange={(e) => handleEditFieldChange('reality', e.target.value)}
                      className="prjn-edit-input"
                    />
                  </EditField>
                  <EditField label="J / Judgment" color="text-purple-500">
                    <textarea
                      value={editingEntry.judgment}
                      onChange={(e) => handleEditFieldChange('judgment', e.target.value)}
                      className="prjn-edit-input"
                    />
                  </EditField>
                  <EditField label="N / Next" color="text-green-500">
                    <textarea
                      value={editingEntry.next}
                      onChange={(e) => handleEditFieldChange('next', e.target.value)}
                      className="prjn-edit-input"
                    />
                  </EditField>
                </div>

                <EditField label="Note / 备注" color="text-gray-400">
                  <textarea
                    value={editingEntry.note ?? ''}
                    onChange={(e) => handleEditFieldChange('note', e.target.value)}
                    className="prjn-edit-input h-20"
                  />
                </EditField>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="px-4 py-2 border border-gray-200 rounded-md text-[11px] font-black uppercase tracking-tighter text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  取消 / CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleUpdateEntry}
                  className="px-4 py-2 bg-black text-white rounded-md text-[11px] font-black uppercase tracking-tighter hover:opacity-90 transition-colors"
                >
                  更新 / UPDATE
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isQuickAddOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              className="max-h-[88vh] overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-200 custom-scrollbar"
              style={{ width: 'min(96vw, 1120px)' }}
            >
              <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest">快速新增 PRJN / Quick Add</h2>
                  <p className="text-[11px] text-gray-400 mt-1">
                    先粘贴并识别，再在下方草稿里像普通新增一样编辑，确认后写入历史记录。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    resetQuickAdd();
                  }}
                  className="p-2 rounded-md text-gray-400 hover:bg-gray-100 hover:text-black transition-colors"
                  title="关闭 / Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="space-y-3">
                  <textarea
                    value={quickAddText}
                    onChange={(e) => setQuickAddText(e.target.value)}
                    placeholder={'Category: tool\nP: 我原本以为...\nR: 实际发生...\nJ: 我现在判断...\nN: 下一步...\nNote: 补充说明...'}
                    className="w-full h-44 resize-none bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm leading-relaxed outline-none focus:border-black transition-colors"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleQuickAddParse}
                        className="px-4 py-2 bg-black text-white rounded-md text-[11px] font-black uppercase tracking-tighter hover:opacity-90 active:scale-[0.98] transition-all"
                      >
                        完成识别 / PARSE
                      </button>
                      <button
                        type="button"
                        onClick={resetQuickAdd}
                        className="px-4 py-2 border border-gray-200 rounded-md text-[11px] font-black uppercase tracking-tighter text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        清空 / CLEAR
                      </button>
                    </div>
                  </div>
                  {quickAddMessage && (
                    <p className="text-[11px] font-bold text-gray-400 leading-relaxed">
                      {quickAddMessage}
                    </p>
                  )}
                </div>

                <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      识别草稿 / Editable Draft
                    </h3>
                  </div>

                  {quickAddDraft ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">分类 / Category</label>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleQuickAddDraftChange('category', cat)}
                              className={cn(
                                "category-btn-minimal",
                                quickAddDraft.category === cat ? "category-btn-minimal-active" : "bg-white"
                              )}
                            >
                              <span className="block text-[9px] font-bold opacity-60">{cat.toUpperCase()}</span>
                              <span className="block mt-0.5">{CATEGORY_MAP[cat]}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <EditField label="P / Predict" color="text-blue-500">
                          <textarea
                            value={quickAddDraft.predict}
                            onChange={(e) => handleQuickAddDraftChange('predict', e.target.value)}
                            className="prjn-edit-input h-24 bg-white"
                          />
                        </EditField>
                        <EditField label="R / Reality" color="text-orange-500">
                          <textarea
                            value={quickAddDraft.reality}
                            onChange={(e) => handleQuickAddDraftChange('reality', e.target.value)}
                            className="prjn-edit-input h-24 bg-white"
                          />
                        </EditField>
                        <EditField label="J / Judgment" color="text-purple-500">
                          <textarea
                            value={quickAddDraft.judgment}
                            onChange={(e) => handleQuickAddDraftChange('judgment', e.target.value)}
                            className="prjn-edit-input h-24 bg-white"
                          />
                        </EditField>
                        <EditField label="N / Next" color="text-green-500">
                          <textarea
                            value={quickAddDraft.next}
                            onChange={(e) => handleQuickAddDraftChange('next', e.target.value)}
                            className="prjn-edit-input h-24 bg-white"
                          />
                        </EditField>
                      </div>
                      <EditField label="Note / 备注" color="text-gray-400">
                        <textarea
                          value={quickAddDraft.note ?? ''}
                          onChange={(e) => handleQuickAddDraftChange('note', e.target.value)}
                          className="prjn-edit-input h-20 bg-white"
                        />
                      </EditField>
                    </div>
                  ) : (
                    <div className="h-72 flex items-center justify-center text-center text-gray-300 text-xs font-bold uppercase tracking-widest">
                      等待识别 / Waiting for parse
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    resetQuickAdd();
                  }}
                  className="px-4 py-2 border border-gray-200 rounded-md text-[11px] font-black uppercase tracking-tighter text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  取消 / CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleQuickAddConfirm}
                  disabled={!isDraftReady(quickAddDraft)}
                  className="px-4 py-2 bg-black text-white rounded-md text-[11px] font-black uppercase tracking-tighter hover:opacity-90 disabled:opacity-30 transition-colors"
                >
                  确认添加 / ADD ENTRY
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MinimalField({ char, color, focusBorder, children }: { char: string; color: string; focusBorder: string; children: React.ReactElement }) {
  return (
    <div className="relative group">
      <span className={cn("absolute left-0 top-3 text-xs font-black", color)}>{char}</span>
      {React.cloneElement(children, {
        className: cn(children.props.className, focusBorder)
      })}
    </div>
  );
}

function EditField({ label, color, children }: { label: string; color: string; children: React.ReactElement }) {
  return (
    <label className="space-y-2 block">
      <span className={cn("text-[10px] font-black uppercase tracking-widest", color)}>{label}</span>
      {children}
    </label>
  );
}

function HistoryCard({ entry, onEdit, onDelete, isDeleting, isEditing }: { entry: PRJNEntry; onEdit: (entry: PRJNEntry) => void; onDelete: (id: string) => void | Promise<void>; isDeleting: boolean; isEditing: boolean; key?: string }) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (showConfirm) {
      onDelete(entry.id);
    } else {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 3000);
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isDeleting ? 0.3 : 1, y: 0, scale: isDeleting ? 0.98 : 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-all group relative",
        isEditing ? "border-black ring-2 ring-black/5" : "border-gray-200",
        isDeleting && "pointer-events-none cursor-wait"
      )}
    >
      <div className="flex justify-between items-start mb-5 pb-3 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-black rounded uppercase tracking-wider">
            <span className="opacity-40 mr-1">{entry.category.toUpperCase()}</span>
            {CATEGORY_MAP[entry.category]}
          </span>
          <time className="text-[10px] text-gray-400 font-mono">
            {format(entry.createdAt, 'yyyy.MM.dd HH:mm')}
          </time>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(entry)}
            disabled={isDeleting}
            className={cn(
              "p-1.5 px-2.5 rounded-md transition-all flex items-center gap-1.5",
              isEditing ? "bg-black text-white" : "text-gray-300 hover:text-black hover:bg-gray-100",
              isDeleting && "opacity-50"
            )}
            title="编辑这条记录 / Edit Entry"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={handleClick}
            disabled={isDeleting}
            className={cn(
              "p-1.5 px-2.5 rounded-md transition-all flex items-center gap-1.5",
              showConfirm 
                ? "bg-red-500 text-white scale-105" 
                : "text-gray-300 hover:text-red-500 hover:bg-red-50",
              isDeleting && "opacity-50"
            )}
            title={showConfirm ? "再次点击确定删除 / Confirm Delete" : "删除这条记录 / Delete Entry"}
          >
            {isDeleting ? (
              <span className="text-[9px] font-black tracking-tighter">正在删除 / DELETING...</span>
            ) : showConfirm ? (
              <span className="text-[9px] font-black tracking-tighter">确认删除? / CONFIRM?</span>
            ) : (
              <Trash2 size={12} />
            )}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
        <HistorySection label="Predict ｜ 预期" color="text-blue-500" content={entry.predict} />
        <HistorySection label="Reality ｜ 实际" color="text-orange-500" content={entry.reality} />
        <HistorySection label="Judgment ｜ 判断" color="text-purple-500" content={entry.judgment} />
        <HistorySection label="Next ｜ 行动" color="text-green-500" content={entry.next} />
      </div>

      {entry.note && (
        <div className="mt-5 pt-4 border-t border-gray-50 italic text-gray-400 text-[11px] leading-relaxed">
          <span className="not-italic font-bold mr-1 text-[9px] uppercase tracking-tighter text-gray-300">备注 / Note:</span>
          {entry.note}
        </div>
      )}
    </motion.article>
  );
}

function HistorySection({ label, color, content }: { label: string; color: string; content: string }) {
  return (
    <div className="space-y-1">
      <p className={cn("text-[9px] font-black uppercase tracking-tighter mb-0.5 opacity-80", color)}>{label}</p>
      <p className="text-[13px] leading-relaxed text-gray-700 whitespace-pre-wrap">{content}</p>
    </div>
  );
}
