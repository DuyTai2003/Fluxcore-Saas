import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'critical';
  read: boolean;
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  sendNotification: (title: string, body: string, type: Notification['type'], userId?: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setNotifications(data);
  }, [profile]);

  // Load initial notifications
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Subscribe to real-time notifications via Supabase Realtime
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel(`notifications:${profile.tenant_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;

          // Update state immediately (real-time push)
          setNotifications((prev) => [newNotif, ...prev.slice(0, 49)]);

          // Show toast / in-app alert
          if (
            Notification.permission === 'granted' &&
            document.visibilityState !== 'visible'
          ) {
            new Notification(newNotif.title, { body: newNotif.body });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!profile) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('tenant_id', profile.tenant_id)
      .eq('read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [profile]);

  const sendNotification = useCallback(
    async (title: string, body: string, type: Notification['type'], userId?: string) => {
      if (!profile) return;
      await supabase.from('notifications').insert({
        tenant_id: profile.tenant_id,
        user_id: userId || profile.id,
        title,
        body,
        type,
      });
    },
    [profile]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        sendNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('[FluxCore] useNotifications must be used within a NotificationProvider');
  }
  return context;
}