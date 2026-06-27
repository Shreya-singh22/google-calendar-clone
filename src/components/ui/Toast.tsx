'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X, Undo2 } from 'lucide-react';
import { useEffect } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function Toast({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="pointer-events-auto flex items-center gap-3 bg-gray-800 dark:bg-gray-700 text-white px-4 py-3 rounded-xl shadow-xl min-w-[280px]"
    >
      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
      <span className="text-sm flex-1">{toast.message}</span>
      {toast.action && (
        <button
          onClick={toast.action.onClick}
          className="text-sm font-medium text-blue-300 hover:text-blue-200 flex items-center gap-1 shrink-0"
        >
          <Undo2 className="w-3.5 h-3.5" />
          {toast.action.label}
        </button>
      )}
      <button onClick={() => onDismiss(toast.id)} className="text-gray-400 hover:text-white ml-1">
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
