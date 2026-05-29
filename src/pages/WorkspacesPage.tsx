import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Plus, Search, Play, Pause, Trash2, Factory, X } from 'lucide-react';
import { toast } from 'sonner';

interface Workspace {
  id: string;
  name: string;
  type: string;
  target_throughput: number;
  current_task: string | null;
  status: 'active' | 'idle' | 'paused';
  created_at: string;
}

const initialWorkspaces: Workspace[] = [
  { id: '1', name: 'Station Alpha', type: 'Production Line', target_throughput: 500, current_task: 'Batch #A-2041', status: 'active', created_at: new Date().toISOString() },
  { id: '2', name: 'Station Beta', type: 'Assembly', target_throughput: 450, current_task: 'Batch #B-1089', status: 'active', created_at: new Date().toISOString() },
  { id: '3', name: 'Station Gamma', type: 'QC Checkpoint', target_throughput: 600, current_task: 'Inspection Round 3', status: 'idle', created_at: new Date().toISOString() },
  { id: '4', name: 'Station Delta', type: 'Packaging', target_throughput: 400, current_task: null, status: 'paused', created_at: new Date().toISOString() },
];

function AddWorkspaceModal({ open, onClose, onAdd, t }: { open: boolean; onClose: () => void; onAdd: (ws: Workspace) => void; t: (key: string) => string }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [target, setTarget] = useState(500);

  if (!open) return null;

  const handleSubmit = () => {
    if (!name.trim() || !type.trim()) return;
    onAdd({
      id: Date.now().toString(),
      name: name.trim(),
      type: type.trim(),
      target_throughput: target,
      current_task: null,
      status: 'idle',
      created_at: new Date().toISOString(),
    });
    setName('');
    setType('');
    setTarget(500);
    onClose();
    toast.success(`${t('workspaces.addWorkspace')}: ${name}`);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-flux-sand bg-white p-6 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-flux-charcoal">{t('workspaces.addWorkspace')}</h3>
            <button onClick={onClose} className="rounded-lg p-1 text-flux-charcoal/30 hover:text-flux-charcoal"><X className="h-5 w-5" /></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-flux-charcoal/70 mb-1">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Station Epsilon" className="w-full rounded-xl border border-flux-sand bg-flux-cream/50 px-4 py-2.5 text-sm text-flux-charcoal placeholder:text-flux-charcoal/30 focus:border-flux-accent focus:outline-none focus:ring-2 focus:ring-flux-accent/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-flux-charcoal/70 mb-1">Type</label>
              <input type="text" value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. Assembly Line" className="w-full rounded-xl border border-flux-sand bg-flux-cream/50 px-4 py-2.5 text-sm text-flux-charcoal placeholder:text-flux-charcoal/30 focus:border-flux-accent focus:outline-none focus:ring-2 focus:ring-flux-accent/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-flux-charcoal/70 mb-1">{t('workspaces.target')} ({t('common.perHour')})</label>
              <input type="number" value={target} onChange={(e) => setTarget(parseInt(e.target.value) || 0)} min={0} className="w-full rounded-xl border border-flux-sand bg-flux-cream/50 px-4 py-2.5 text-sm text-flux-charcoal focus:border-flux-accent focus:outline-none focus:ring-2 focus:ring-flux-accent/20" />
            </div>
            <button onClick={handleSubmit} className="w-full rounded-xl bg-flux-charcoal py-2.5 text-sm font-semibold text-white hover:bg-flux-charcoal/90 transition-colors">
              {t('workspaces.addWorkspace')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function WorkspacesPage() {
  const { t } = useTranslation();
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = workspaces.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.type.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (status: Workspace['status']) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'idle': return 'bg-amber-100 text-amber-700';
      case 'paused': return 'bg-slate-100 text-slate-500';
    }
  };

  const toggleStatus = (id: string) => {
    setWorkspaces((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        const next: Workspace['status'] = w.status === 'active' ? 'paused' : 'active';
        return { ...w, status: next };
      })
    );
  };

  const removeWorkspace = (id: string) => {
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    toast.success('Workspace removed');
  };

  const handleAdd = (ws: Workspace) => {
    setWorkspaces((prev) => [ws, ...prev]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <AddWorkspaceModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={handleAdd} t={t} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-flux-charcoal">{t('workspaces.title')}</h2>
          <p className="text-sm text-flux-charcoal/40">{t('workspaces.subtitle')}</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-flux-charcoal px-4 py-2.5 text-sm font-semibold text-white hover:bg-flux-charcoal/90 transition-all">
          <Plus className="h-4 w-4" /> {t('workspaces.addWorkspace')}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-flux-charcoal/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('workspaces.search')}
          className="w-full rounded-xl border border-flux-sand bg-white/80 pl-10 pr-4 py-2.5 text-sm text-flux-charcoal placeholder:text-flux-charcoal/30 focus:border-flux-accent focus:outline-none focus:ring-2 focus:ring-flux-accent/20 transition-all"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((ws) => (
          <div key={ws.id} className="rounded-2xl border border-flux-sand bg-white p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-flux-warm">
                  <Factory className="h-5 w-5 text-flux-earth" />
                </div>
                <div>
                  <h3 className="font-semibold text-flux-charcoal">{ws.name}</h3>
                  <p className="text-xs text-flux-charcoal/40">{ws.type}</p>
                </div>
              </div>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium capitalize', statusColor(ws.status))}>
                {t(`workspaces.status.${ws.status}`)}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-flux-charcoal/40">{t('workspaces.target')}</span>
                <span className="font-medium text-flux-charcoal">{ws.target_throughput}{t('common.perHour')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-flux-charcoal/40">{t('workspaces.currentTask')}</span>
                <span className={cn('font-medium', ws.current_task ? 'text-flux-charcoal' : 'text-flux-charcoal/25')}>
                  {ws.current_task || t('workspaces.none')}
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-flux-sand/50 pt-4">
              {ws.status === 'active' ? (
                <button onClick={() => toggleStatus(ws.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors">
                  <Pause className="h-3 w-3" /> {t('workspaces.pause')}
                </button>
              ) : (
                <button onClick={() => toggleStatus(ws.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors">
                  <Play className="h-3 w-3" /> {t('workspaces.start')}
                </button>
              )}
              <button onClick={() => removeWorkspace(ws.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors">
                <Trash2 className="h-3 w-3" /> {t('workspaces.remove')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center">
          <Factory className="mx-auto h-10 w-10 text-flux-charcoal/15" />
          <p className="mt-3 text-sm text-flux-charcoal/30">{t('workspaces.noWorkspaces')}</p>
        </div>
      )}
    </div>
  );
}