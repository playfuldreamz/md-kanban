import { useEffect, useState } from 'react';
import type { Card } from '../types';

interface ToastNotificationsProps {
  error: string | null;
  connected: boolean;
  undoCard: { card: Card; columnId: string } | null;
  onUndo: () => void;
}

/**
 * Notification bar for connection status, errors, and undo-delete.
 */
export default function ToastNotifications({ error, connected, undoCard, onUndo }: ToastNotificationsProps) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'error' | 'warning' | 'success' | 'undo'>('error');
  const [action, setAction] = useState<{ label: string; onClick: () => void } | null>(null);

  // Connection status
  useEffect(() => {
    if (!connected) {
      setMessage('Connection lost — reconnecting...');
      setType('warning');
      setAction(null);
      setVisible(true);
    } else {
      const timer = setTimeout(() => setVisible(false), 3000);
      if (visible && type === 'warning') {
        setMessage('Reconnected');
        setType('success');
        setAction(null);
        setVisible(true);
      }
      return () => clearTimeout(timer);
    }
  }, [connected]);

  // Errors
  useEffect(() => {
    if (error) {
      setMessage(error);
      setType('error');
      setAction(null);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Undo delete
  useEffect(() => {
    if (undoCard) {
      setMessage(`Deleted "${undoCard.card.title}"`);
      setType('undo');
      setAction({ label: 'Undo', onClick: onUndo });
      setVisible(true);
    } else if (type === 'undo') {
      setVisible(false);
    }
  }, [undoCard]);

  if (!visible) return null;

  const colors: Record<string, string> = {
    error: 'bg-error-subtle border-error text-error-foreground',
    warning: 'bg-warning-subtle border-warning text-warning-foreground',
    success: 'bg-success-subtle border-success text-success-foreground',
    undo: 'bg-background-subtle border-border text-foreground',
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className={`px-4 py-2 rounded-lg border text-sm shadow-lg flex items-center gap-3 ${colors[type]}`}>
        <span>{message}</span>
        {action && (
          <button
            onClick={() => { action.onClick(); setVisible(false); }}
            className="font-medium text-primary hover:text-primary-strong transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
