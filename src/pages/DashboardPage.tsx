import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '@/contexts/AuthContext';
import { cn, formatNumber, formatPercent } from '@/lib/utils';
import {
  BarChart3,
  TrendingUp,
  Users,
  Activity,
  GripVertical,
  Maximize2,
  Minimize2,
  Download,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ─── Mock Data ───

const hourlyData = [
  { slot: '07:00', throughput: 420, target: 400 },
  { slot: '08:00', throughput: 480, target: 450 },
  { slot: '09:00', throughput: 390, target: 450 },
  { slot: '10:00', throughput: 510, target: 500 },
  { slot: '11:00', throughput: 460, target: 450 },
  { slot: '12:00', throughput: 300, target: 350 },
  { slot: '13:00', throughput: 410, target: 400 },
  { slot: '14:00', throughput: 540, target: 500 },
  { slot: '15:00', throughput: 490, target: 500 },
  { slot: '16:00', throughput: 520, target: 500 },
];

const workspaceData = [
  { name: 'Station A', throughput: 2840, efficiency: 93 },
  { name: 'Station B', throughput: 3120, efficiency: 97 },
  { name: 'Station C', throughput: 2450, efficiency: 82 },
  { name: 'Station D', throughput: 2680, efficiency: 88 },
  { name: 'Station E', throughput: 1980, efficiency: 71 },
];

const trendData = [
  { date: 'Mon', value: 2400 },
  { date: 'Tue', value: 3200 },
  { date: 'Wed', value: 2800 },
  { date: 'Thu', value: 3600 },
  { date: 'Fri', value: 3100 },
  { date: 'Sat', value: 1800 },
  { date: 'Sun', value: 1200 },
];

const COLORS = ['#D4A853', '#C9A87C', '#E8D5C0', '#2D2A26', '#A89070'];

// ─── Types ───

interface KpiCardData {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ElementType;
}

type WidgetType = 'kpi' | 'hourly-bar' | 'workspace-bar' | 'trend-line' | 'efficiency-pie';

interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  size: 'sm' | 'md' | 'lg' | 'xl';
  visible: boolean;
}

// ─── Sortable Widget Wrapper ───

function SortableWidget({
  widget,
  children,
  onRemove,
}: {
  widget: DashboardWidget;
  children: React.ReactNode;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const sizeClasses: Record<string, string> = {
    sm: 'col-span-1', md: 'col-span-1 lg:col-span-2', lg: 'col-span-1 lg:col-span-3', xl: 'col-span-1 lg:col-span-4',
  };
  return (
    <div ref={setNodeRef} style={style} className={cn('rounded-2xl border border-flux-sand bg-white p-5 shadow-sm transition-shadow hover:shadow-md', sizeClasses[widget.size], isDragging && 'opacity-50 shadow-lg z-50')}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button {...listeners} {...attributes} className="cursor-grab text-flux-charcoal/20 hover:text-flux-charcoal/50 active:cursor-grabbing"><GripVertical className="h-4 w-4" /></button>
          <h3 className="text-sm font-semibold text-flux-charcoal">{widget.title}</h3>
        </div>
        <button onClick={() => onRemove(widget.id)} className="rounded-lg p-1 text-flux-charcoal/30 hover:bg-red-50 hover:text-red-400 transition-colors" title="Hide widget"><Minimize2 className="h-4 w-4" /></button>
      </div>
      {children}
    </div>
  );
}

// ─── KPI Cards ───

function KpiCards() {
  const { t } = useTranslation();
  const kpiCards: KpiCardData[] = [
    { title: t('dashboard.kpi.totalThroughput'), value: '14,520', change: '+12.4%', trend: 'up', icon: Activity },
    { title: t('dashboard.kpi.activeWorkspaces'), value: '12', change: '+2', trend: 'up', icon: BarChart3 },
    { title: t('dashboard.kpi.avgEfficiency'), value: '86.2%', change: '-1.3%', trend: 'down', icon: TrendingUp },
    { title: t('dashboard.kpi.operatorsOnline'), value: '48', change: '+5', trend: 'up', icon: Users },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {kpiCards.map((kpi) => (
        <div key={kpi.title} className="rounded-xl border border-flux-sand/50 bg-flux-cream/50 p-4 transition-all hover:border-flux-earth/30 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <kpi.icon className="h-5 w-5 text-flux-earth" />
            <span className={cn('text-xs font-medium', kpi.trend === 'up' ? 'text-emerald-600' : 'text-red-500')}>{kpi.change}</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-flux-charcoal">{kpi.value}</p>
          <p className="text-xs text-flux-charcoal/40">{kpi.title}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Chart Widgets ───

function HourlyBarChart() {
  return (<ResponsiveContainer width="100%" height={260}><BarChart data={hourlyData} barSize={20}><CartesianGrid strokeDasharray="3 3" stroke="hsl(36 15% 85%)" /><XAxis dataKey="slot" tick={{ fontSize: 11, fill: 'hsl(30 5% 40%)' }} /><YAxis tick={{ fontSize: 11, fill: 'hsl(30 5% 40%)' }} /><Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(36 15% 82%)', background: 'white', fontSize: '12px' }} /><Bar dataKey="throughput" fill="#D4A853" radius={[4, 4, 0, 0]} name="Actual" /><Bar dataKey="target" fill="#E8D5C0" radius={[4, 4, 0, 0]} name="Target" /></BarChart></ResponsiveContainer>);
}

function WorkspaceBarChart() {
  return (<ResponsiveContainer width="100%" height={260}><BarChart data={workspaceData} layout="vertical" barSize={16}><CartesianGrid strokeDasharray="3 3" stroke="hsl(36 15% 85%)" /><XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(30 5% 40%)' }} /><YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'hsl(30 5% 40%)' }} width={80} /><Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(36 15% 82%)', background: 'white', fontSize: '12px' }} /><Bar dataKey="throughput" fill="#C9A87C" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer>);
}

function TrendLineChart() {
  return (<ResponsiveContainer width="100%" height={260}><AreaChart data={trendData}><defs><linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#D4A853" stopOpacity={0.3} /><stop offset="95%" stopColor="#D4A853" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="hsl(36 15% 85%)" /><XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(30 5% 40%)' }} /><YAxis tick={{ fontSize: 11, fill: 'hsl(30 5% 40%)' }} /><Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(36 15% 82%)', background: 'white', fontSize: '12px' }} /><Area type="monotone" dataKey="value" stroke="#D4A853" fill="url(#colorValue)" strokeWidth={2} /></AreaChart></ResponsiveContainer>);
}

function EfficiencyPieChart() {
  return (<ResponsiveContainer width="100%" height={260}><PieChart><Pie data={workspaceData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="throughput" nameKey="name">{workspaceData.map((_, i) => (<Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />))}</Pie><Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(36 15% 82%)', background: 'white', fontSize: '12px' }} /></PieChart></ResponsiveContainer>);
}

// ─── Hidden Widgets ───

function HiddenWidgets({ hidden, onRestore }: { hidden: DashboardWidget[]; onRestore: (id: string) => void }) {
  const { t } = useTranslation();
  if (hidden.length === 0) return null;
  return (
    <div className="mt-4 rounded-xl border border-dashed border-flux-sand/50 p-3">
      <p className="mb-2 text-xs font-medium text-flux-charcoal/40">{t('dashboard.hiddenWidgets')}</p>
      <div className="flex flex-wrap gap-2">
        {hidden.map((w) => (<button key={w.id} onClick={() => onRestore(w.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-flux-sand bg-white px-3 py-1.5 text-xs text-flux-charcoal/60 hover:border-flux-accent hover:text-flux-accent transition-all"><Maximize2 className="h-3 w-3" />{w.title}</button>))}
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD PAGE ───

export function DashboardPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();

  const defaultWidgets: DashboardWidget[] = [
    { id: 'widget-1', type: 'kpi', title: t('dashboard.widgets.keyMetrics'), size: 'xl', visible: true },
    { id: 'widget-2', type: 'hourly-bar', title: t('dashboard.widgets.hourlyThroughput'), size: 'lg', visible: true },
    { id: 'widget-3', type: 'workspace-bar', title: t('dashboard.widgets.workspacePerformance'), size: 'lg', visible: true },
    { id: 'widget-4', type: 'trend-line', title: t('dashboard.widgets.sevenDayTrend'), size: 'md', visible: true },
    { id: 'widget-5', type: 'efficiency-pie', title: t('dashboard.widgets.efficiencyDistribution'), size: 'md', visible: true },
  ];

  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => {
    const saved = localStorage.getItem('fluxcore-dashboard-layout');
    if (saved) { try { return JSON.parse(saved) as DashboardWidget[]; } catch { /* fallback */ } }
    return defaultWidgets;
  });

  const visibleWidgets = useMemo(() => widgets.filter((w) => w.visible), [widgets]);
  const hiddenWidgets = useMemo(() => widgets.filter((w) => !w.visible), [widgets]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((w) => w.id === active.id);
        const newIndex = items.findIndex((w) => w.id === over.id);
        const updated = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('fluxcore-dashboard-layout', JSON.stringify(updated));
        return updated;
      });
    }
  }, []);

  const handleRemove = useCallback((id: string) => {
    setWidgets((prev) => { const updated = prev.map((w) => (w.id === id ? { ...w, visible: false } : w)); localStorage.setItem('fluxcore-dashboard-layout', JSON.stringify(updated)); return updated; });
  }, []);

  const handleRestore = useCallback((id: string) => {
    setWidgets((prev) => { const updated = prev.map((w) => (w.id === id ? { ...w, visible: true } : w)); localStorage.setItem('fluxcore-dashboard-layout', JSON.stringify(updated)); return updated; });
  }, []);

  const resetLayout = () => { setWidgets(defaultWidgets); localStorage.removeItem('fluxcore-dashboard-layout'); };

  const handleExport = () => {
    const rows = [
      ['Hourly Throughput Report', '', ''],
      ['Generated:', new Date().toLocaleString(), ''],
      ['', '', ''],
      ['Time Slot', 'Actual Throughput', 'Target'],
      ...hourlyData.map((d) => [d.slot, d.throughput.toString(), d.target.toString()]),
      ['', '', ''],
      ['Workspace Summary', '', ''],
      ['Station', 'Throughput', 'Efficiency (%)'],
      ...workspaceData.map((d) => [d.name, d.throughput.toString(), d.efficiency.toString()]),
      ['', '', ''],
      ['7-Day Trend', '', ''],
      ['Day', 'Value', ''],
      ...trendData.map((d) => [d.date, d.value.toString(), '']),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fluxcore-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderWidget = (widget: DashboardWidget) => {
    switch (widget.type) {
      case 'kpi': return <KpiCards />;
      case 'hourly-bar': return <HourlyBarChart />;
      case 'workspace-bar': return <WorkspaceBarChart />;
      case 'trend-line': return <TrendLineChart />;
      case 'efficiency-pie': return <EfficiencyPieChart />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-flux-charcoal">{t('dashboard.welcome', { name: profile?.full_name?.split(' ')[0] || 'User' })}</h2>
          <p className="text-sm text-flux-charcoal/40">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetLayout} className="inline-flex items-center gap-1.5 rounded-xl border border-flux-sand px-3 py-2 text-xs font-medium text-flux-charcoal/50 hover:bg-flux-warm/50 transition-colors"><RefreshCw className="h-3.5 w-3.5" />{t('dashboard.resetLayout')}</button>
          <button onClick={handleExport} className="inline-flex items-center gap-1.5 rounded-xl bg-flux-charcoal px-4 py-2 text-xs font-semibold text-white hover:bg-flux-charcoal/90 transition-colors"><Download className="h-3.5 w-3.5" />{t('dashboard.exportReport')}</button>
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleWidgets.map((w) => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            {visibleWidgets.map((widget) => (<SortableWidget key={widget.id} widget={widget} onRemove={handleRemove}>{renderWidget(widget)}</SortableWidget>))}
          </div>
        </SortableContext>
      </DndContext>
      <HiddenWidgets hidden={hiddenWidgets} onRestore={handleRestore} />
      <p className="text-center text-xs text-flux-charcoal/25">{t('dashboard.dragHint')}</p>
    </div>
  );
}