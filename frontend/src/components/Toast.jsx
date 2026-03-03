import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg, d) => add(msg, 'success', d),
    error:   (msg, d) => add(msg, 'error', d),
    info:    (msg, d) => add(msg, 'info', d),
  };

  const icons = { success: CheckCircle, error: AlertCircle, info: Info };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-wrap">
        {toasts.map(t => {
          const Icon = icons[t.type] || Info;
          return (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <Icon size={16} />
              <span style={{ flex: 1 }}>{t.message}</span>
              <button
                onClick={() => remove(t.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6, padding: 2 }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
};
