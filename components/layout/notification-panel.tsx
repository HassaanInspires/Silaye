'use client';

import * as React from 'react';
import { Bell, Trash2, CheckCheck, X, BellOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  NOTIF_TYPE_COLORS,
  NOTIFICATIONS_UPDATE_EVENT,
  type StoredNotification,
} from '@/lib/notification-store';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  return `${diffDay} days ago`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<StoredNotification[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Load notifications when panel opens
  const loadNotifications = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await getAllNotifications();
      setNotifications(items);
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  // React to cross-component notification store updates
  React.useEffect(() => {
    const handler = () => {
      if (isOpen) loadNotifications();
    };
    window.addEventListener(NOTIFICATIONS_UPDATE_EVENT, handler);
    return () => window.removeEventListener(NOTIFICATIONS_UPDATE_EVENT, handler);
  }, [isOpen, loadNotifications]);

  // Close on Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    await loadNotifications();
  };

  const handleClearAll = async () => {
    await clearAllNotifications();
    setNotifications([]);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setDeletingId(null);
  };

  const handleRowTap = async (notif: StoredNotification) => {
    await markAsRead(notif.id);
    if (notif.route) {
      router.push(notif.route);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Bottom Sheet Panel ─────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        className="fixed bottom-0 left-0 right-0 z-[160] md:hidden max-h-[85dvh] flex flex-col rounded-t-3xl bg-[#0F1115] border-t border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom duration-300"
      >
        {/* Drag Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 shrink-0" aria-hidden="true" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.07] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                اطلاعات
                <span className="ml-2 font-sans text-[11px] text-gray-400 font-normal">Notifications</span>
              </h2>
              {unreadCount > 0 && (
                <p className="text-[10px] text-primary font-medium font-sans">
                  {unreadCount} unread
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-semibold font-sans px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer"
                aria-label="Mark all as read"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 font-semibold font-sans px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                aria-label="Clear all notifications"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear all</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close notifications"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {isLoading ? (
            // Loading skeletons
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] animate-pulse">
                  <div className="h-9 w-9 rounded-xl bg-white/10 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/10 rounded w-3/4" />
                    <div className="h-2.5 bg-white/10 rounded w-full" />
                    <div className="h-2.5 bg-white/10 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <BellOff className="h-8 w-8 text-gray-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-gray-300 font-urdu-serif">کوئی اطلاع نہیں</p>
                <p className="text-xs text-gray-500 font-sans">No notifications yet</p>
                <p className="text-[10px] text-gray-600 font-sans mt-2 max-w-[200px] mx-auto leading-relaxed">
                  Morning briefings and urgent order alerts will appear here
                </p>
              </div>
            </div>
          ) : (
            // Notification rows
            <div className="p-3 space-y-2 pb-safe">
              {notifications.map((notif) => {
                const colors = NOTIF_TYPE_COLORS[notif.type];
                const isDeleting = deletingId === notif.id;

                return (
                  <div
                    key={notif.id}
                    className={cn(
                      'flex items-start gap-3 rounded-2xl border p-3 transition-all duration-200',
                      colors.bg,
                      colors.border,
                      !notif.isRead && 'ring-1 ring-white/10',
                      isDeleting && 'opacity-0 scale-95'
                    )}
                  >
                    {/* Unread dot + Icon */}
                    <div className="shrink-0 relative pt-0.5">
                      <div className="h-9 w-9 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center text-base">
                        {colors.icon}
                      </div>
                      {!notif.isRead && (
                        <span
                          className={cn(
                            'absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0F1115]',
                            colors.dot
                          )}
                          aria-label="Unread"
                        />
                      )}
                    </div>

                    {/* Content — tappable area */}
                    <button
                      type="button"
                      onClick={() => handleRowTap(notif)}
                      className="flex-1 text-left min-w-0 cursor-pointer"
                      aria-label={`Open: ${notif.title}`}
                    >
                      <p
                        className={cn(
                          'text-xs font-semibold leading-snug line-clamp-1 font-sans',
                          notif.isRead ? 'text-gray-300' : 'text-white'
                        )}
                      >
                        {notif.title}
                      </p>
                      <p className="text-[11px] text-gray-400 leading-snug mt-0.5 line-clamp-2 font-sans">
                        {notif.body}
                      </p>
                      <p className={cn('text-[10px] font-mono mt-1.5', colors.text)}>
                        {formatRelativeTime(notif.timestamp)}
                      </p>
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDelete(notif.id)}
                      disabled={isDeleting}
                      className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
                      aria-label={`Delete notification: ${notif.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}

              {/* Bottom clearance for safe area */}
              <div className="h-6 w-full shrink-0" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default NotificationPanel;
