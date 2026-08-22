'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { useToast } from '@/components/ToastProvider';
import { getCategories, createCategory, updateCategory, HelpdeskCategory, Priority, PRIORITY_OPTIONS } from '@/lib/helpdesk';

export default function CategoriesPage() {
  const toast = useToast();
  const [categories, setCategories] = useState<HelpdeskCategory[]>([]);
  const [name, setName] = useState('');
  const [defaultPriority, setDefaultPriority] = useState<Priority>('MEDIUM');

  function load() {
    getCategories().then(setCategories);
  }
  useEffect(load, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createCategory({ name: name.trim(), defaultPriority });
      setName('');
      setDefaultPriority('MEDIUM');
      toast.success('Category added');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not add category.');
    }
  }

  async function handlePriorityChange(id: number, value: Priority) {
    await updateCategory(id, { defaultPriority: value });
    load();
  }

  return (
    <main className="min-h-screen bg-bg pl-20">
      <AppHeader />
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-display font-bold text-2xl text-primary mb-1">Issue categories</h1>
        <p className="text-muted text-sm mb-6">
          The default priority applies automatically when someone submits under this category.
        </p>

        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name"
            className="flex-1 rounded-md border border-border px-3 py-2 text-sm bg-surface"
          />
          <select
            value={defaultPriority}
            onChange={(e) => setDefaultPriority(e.target.value as Priority)}
            className="rounded-md border border-border px-3 py-2 text-sm bg-surface"
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label.split(' — ')[0]}
              </option>
            ))}
          </select>
          <button className="flex items-center gap-1 bg-primary text-white px-3 py-2 rounded-md text-sm">
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>

        <div className="bg-surface border border-border rounded-lg divide-y divide-border">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{c.name}</span>
              <select
                value={c.defaultPriority}
                onChange={(e) => handlePriorityChange(c.id, e.target.value as Priority)}
                className="rounded-md border border-border px-2 py-1 text-xs bg-bg"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label.split(' — ')[0]}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {categories.length === 0 && <p className="text-sm text-muted px-4 py-6 text-center">No categories yet.</p>}
        </div>
      </div>
    </main>
  );
}
