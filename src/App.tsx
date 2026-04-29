/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { nanoid } from 'nanoid';
import { format } from 'date-fns';
import { 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  ClipboardList,
  Pencil,
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

export default function App() {
  // Form State
  const [category, setCategory] = useState<PRJNCategory>('learning');
  const [predict, setPredict] = useState('');
  const [reality, setReality] = useState('');
  const [judgment, setJudgment] = useState('');
  const [next, setNext] = useState('');
  const [note, setNote] = useState('');
  const [quickPasteText, setQuickPasteText] = useState('');
  const [quickPasteMessage, setQuickPasteMessage] = useState('');
  const [isQuickPasteOpen, setIsQuickPasteOpen] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

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
    setEditingEntryId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!predict || !reality || !judgment || !next) {
      alert('请填写完整的 PRJN 信息');
      return;
    }

    setIsSaving(true);
    try {
      if (editingEntryId) {
        await db.entries.update(editingEntryId, {
          category,
          predict,
          reality,
          judgment,
          next,
          note: note.trim() || undefined,
        });
      } else {
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
      }

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
      if (editingEntryId === id) {
        resetForm();
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

  const applyParsedPRJN = (collapseAfterParse = false) => {
    if (!quickPasteText.trim()) return;

    const parsed = parsePRJNText(quickPasteText);
    const recognizedFields = Object.values(parsed).filter((value) => value?.trim()).length;

    if (recognizedFields === 0) {
      setQuickPasteMessage('未识别到可填入字段 / Nothing parsed');
      return;
    }

    setPredict(parsed.predict ?? '');
    setReality(parsed.reality ?? '');
    setJudgment(parsed.judgment ?? '');
    setNext(parsed.next ?? '');
    setNote(parsed.note ?? '');
    setIsNoteOpen(Boolean(parsed.note?.trim()));

    if (parsed.category) {
      const normalizedCategory = parsed.category.trim().toLowerCase();

      if (isPRJNCategory(normalizedCategory)) {
        setCategory(normalizedCategory);
        setQuickPasteMessage('已解析到表单 / Parsed into form');
      } else {
        setQuickPasteMessage(`已解析到表单，分类 "${parsed.category}" 不在当前范围内 / Category kept unchanged`);
      }
    } else {
      setQuickPasteMessage('已解析到表单 / Parsed into form');
    }

    if (collapseAfterParse && recognizedFields > 0) {
      setIsQuickPasteOpen(false);
    }
  };

  const handleQuickPasteParse = () => {
    applyParsedPRJN(true);
  };

  const handleQuickPasteClear = () => {
    setQuickPasteText('');
    setQuickPasteMessage('');
  };

  const handleEdit = (entry: PRJNEntry) => {
    setCategory(entry.category);
    setPredict(entry.predict);
    setReality(entry.reality);
    setJudgment(entry.judgment);
    setNext(entry.next);
    setNote(entry.note ?? '');
    setIsNoteOpen(Boolean(entry.note));
    setEditingEntryId(entry.id);
    setIsQuickPasteOpen(false);
    setQuickPasteMessage('正在编辑历史记录 / Editing entry');
  };

  const handleCancelEdit = () => {
    resetForm();
    setQuickPasteMessage('');
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
        <button 
          onClick={handleExport}
          className="text-[10px] font-bold px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 tracking-widest uppercase"
        >
          <Download size={12} />
          数据导出 / EXPORT
        </button>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Pane: Input Form */}
        <section className="w-full md:w-[400px] border-r border-gray-200 bg-white p-8 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="mb-6 border border-gray-200 rounded-xl bg-gray-50/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsQuickPasteOpen(!isQuickPasteOpen)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white transition-colors"
            >
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                快速粘贴 PRJN / Quick Paste
              </span>
              {isQuickPasteOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <AnimatePresence>
              {isQuickPasteOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-3">
                    <p className="text-[10px] font-bold text-gray-400 leading-relaxed">
                      粘贴后离开输入框会自动解析，点击解析后会折叠回表单 / Auto parses on blur
                    </p>
                    <textarea
                      value={quickPasteText}
                      onChange={(e) => setQuickPasteText(e.target.value)}
                      onBlur={() => applyParsedPRJN(false)}
                      placeholder={'Category: tool\nP: 我原本以为...\nR: 实际发生...\nJ: 我现在判断...\nN: 下一步...\nNote: 补充说明...'}
                      className="w-full h-28 resize-none bg-white border border-gray-200 rounded-lg p-3 text-xs leading-relaxed outline-none focus:border-black transition-colors"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleQuickPasteParse}
                          className="px-3 py-2 bg-black text-white rounded-md text-[10px] font-black uppercase tracking-tighter hover:opacity-90 active:scale-[0.98] transition-all"
                        >
                          解析并填入 / PARSE
                        </button>
                        <button
                          type="button"
                          onClick={handleQuickPasteClear}
                          className="px-3 py-2 border border-gray-200 rounded-md text-[10px] font-black uppercase tracking-tighter text-gray-500 hover:bg-white transition-colors"
                        >
                          清空 / CLEAR
                        </button>
                      </div>
                      {quickPasteMessage && (
                        <span className="text-[10px] font-bold text-gray-400 text-right leading-tight">
                          {quickPasteMessage}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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

            {editingEntryId && (
              <div className="rounded-lg border border-black bg-gray-50 p-3 text-[10px] font-bold text-gray-500 uppercase tracking-tighter flex items-center justify-between">
                <span>正在编辑历史记录 / Editing entry</span>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="p-1 rounded hover:bg-white transition-colors"
                  title="取消编辑 / Cancel edit"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full mt-auto bg-black text-white py-4 rounded-xl font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? '正在保存 / SAVING...' : editingEntryId ? '保存修改 / SAVE CHANGES' : '保存复盘 / SAVE ENTRY'}
            </button>
          </form>
        </section>

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
                  isEditing={editingEntryId === entry.id}
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
