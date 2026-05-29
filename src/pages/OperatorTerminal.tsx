import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { QrCode, Camera, Wifi, WifiOff, Check, X, History, ScanLine } from 'lucide-react';
import { toast } from 'sonner';

interface ScanLog {
  id: string;
  count: number;
  timeSlot: string;
  timestamp: Date;
  synced: boolean;
}

function getCurrentTimeSlot(): string {
  const now = new Date();
  const hour = now.getHours();
  const nextHour = hour + 1;
  return `${hour.toString().padStart(2, '0')}:00-${nextHour.toString().padStart(2, '0')}:00`;
}

export function OperatorTerminal() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncQueue, setSyncQueue] = useState<number>(() => {
    const stored = localStorage.getItem('fluxcore-offline-queue');
    return stored ? JSON.parse(stored).length : 0;
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; streamRef.current = stream; setScanning(true); }
    } catch {
      toast.error(t('terminal.camera.denied'));
    }
  }, [t]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }, []);

  const submitCount = useCallback((value: number) => {
    if (value <= 0) return;
    const timeSlot = getCurrentTimeSlot();
    const log: ScanLog = { id: Date.now().toString(), count: value, timeSlot, timestamp: new Date(), synced: isOnline };
    setScanLogs((prev) => [log, ...prev]);
    setManualInput('');
    if (!isOnline) {
      const queue = JSON.parse(localStorage.getItem('fluxcore-offline-queue') || '[]');
      queue.push({ ...log, operatorId: profile?.id });
      localStorage.setItem('fluxcore-offline-queue', JSON.stringify(queue));
      setSyncQueue(queue.length);
      toast.info(t('terminal.savedOffline'));
    } else {
      toast.success(t('terminal.logged', { count: value }));
    }
  }, [isOnline, profile, t]);

  const handleManualSubmit = () => {
    const num = parseInt(manualInput, 10);
    if (isNaN(num) || num <= 0) { toast.error(t('terminal.manual.invalid')); return; }
    submitCount(num);
  };

  const syncOfflineData = async () => {
    const queue = JSON.parse(localStorage.getItem('fluxcore-offline-queue') || '[]');
    if (queue.length === 0) { toast.info(t('terminal.noOfflineData')); return; }
    toast.success(t('terminal.syncedOffline', { count: queue.length }));
    localStorage.removeItem('fluxcore-offline-queue');
    setSyncQueue(0);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-flux-charcoal">{t('terminal.title')}</h2>
          <p className="text-sm text-flux-charcoal/40">{t('terminal.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn('flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium', isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500')}>
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? t('terminal.online') : t('terminal.offline')}
          </div>
          {syncQueue > 0 && (
            <button onClick={syncOfflineData} className="rounded-lg bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600 hover:bg-amber-100">
              {t('terminal.syncRecords', { count: syncQueue })}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-flux-sand bg-white shadow-sm">
        <div className="bg-flux-charcoal p-3">
          <div className="flex items-center gap-2 text-white/80"><ScanLine className="h-4 w-4" /><span className="text-xs font-medium">{t('terminal.camera.title')}</span></div>
        </div>
        <div className="relative aspect-video bg-flux-charcoal/95">
          {scanning ? (
            <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-flux-charcoal/30"><Camera className="h-12 w-12 mb-3" /><p className="text-sm">{t('terminal.camera.preview')}</p></div>
          )}
          {scanning && (<div className="absolute inset-0 border-2 border-flux-accent/60"><div className="absolute inset-0 flex items-center justify-center"><div className="h-48 w-48 rounded-lg border-2 border-flux-accent animate-pulse" /></div></div>)}
        </div>
        <div className="flex items-center gap-3 p-4">
          {scanning ? (
            <button onClick={stopCamera} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"><X className="h-4 w-4" /> {t('terminal.camera.stop')}</button>
          ) : (
            <button onClick={startCamera} className="inline-flex items-center gap-2 rounded-xl bg-flux-charcoal px-4 py-2.5 text-sm font-medium text-white hover:bg-flux-charcoal/90 transition-colors"><Camera className="h-4 w-4" /> {t('terminal.camera.start')}</button>
          )}
          <button onClick={() => submitCount(1)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"><Check className="h-4 w-4" /> {t('terminal.quickAdd')}</button>
        </div>
      </div>

      <div className="rounded-2xl border border-flux-sand bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-flux-charcoal"><QrCode className="h-4 w-4 text-flux-earth" />{t('terminal.manual.title')}</h3>
        <p className="mb-3 text-xs text-flux-charcoal/40">{t('terminal.manual.timeSlot')}: <span className="font-medium text-flux-charcoal">{getCurrentTimeSlot()}</span></p>
        <div className="flex items-center gap-3">
          <input type="number" value={manualInput} onChange={(e) => setManualInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()} placeholder={t('terminal.manual.placeholder')} min="1" className="flex-1 rounded-xl border border-flux-sand bg-flux-cream/50 px-4 py-2.5 text-sm text-flux-charcoal placeholder:text-flux-charcoal/30 focus:border-flux-accent focus:outline-none focus:ring-2 focus:ring-flux-accent/20 transition-all" />
          <button onClick={handleManualSubmit} className="inline-flex items-center gap-2 rounded-xl bg-flux-charcoal px-6 py-2.5 text-sm font-semibold text-white hover:bg-flux-charcoal/90 transition-colors">{t('terminal.manual.submit')}</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{[1, 5, 10, 25, 50, 100].map((val) => (<button key={val} onClick={() => submitCount(val)} className="rounded-lg border border-flux-sand/50 bg-flux-cream/30 px-3 py-1.5 text-sm font-medium text-flux-charcoal/60 hover:border-flux-earth/30 hover:bg-flux-warm/50 hover:text-flux-charcoal transition-all">+{val}</button>))}</div>
      </div>

      <div className="rounded-2xl border border-flux-sand bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><History className="h-4 w-4 text-flux-earth" /><h3 className="text-sm font-semibold text-flux-charcoal">{t('terminal.recentActivity')}</h3><span className="text-xs text-flux-charcoal/30">({scanLogs.length})</span></div>
        {scanLogs.length === 0 ? (
          <p className="py-6 text-center text-sm text-flux-charcoal/30">{t('terminal.noEntries')}</p>
        ) : (
          <div className="max-h-64 overflow-y-auto scrollbar-thin space-y-2">
            {scanLogs.map((log) => (
              <div key={log.id} className={cn('flex items-center justify-between rounded-xl px-3 py-2 text-sm', log.synced ? 'bg-flux-cream/50' : 'bg-amber-50/50')}>
                <div className="flex items-center gap-3"><span className="font-semibold text-flux-charcoal">+{log.count}</span><span className="text-flux-charcoal/40">{log.timeSlot}</span></div>
                <div className="flex items-center gap-2">
                  {log.synced ? (<span className="flex items-center gap-1 text-[10px] text-emerald-600"><Wifi className="h-3 w-3" /> {t('terminal.synced')}</span>) : (<span className="flex items-center gap-1 text-[10px] text-amber-600"><WifiOff className="h-3 w-3" /> {t('terminal.pending')}</span>)}
                  <span className="text-[10px] text-flux-charcoal/25">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}