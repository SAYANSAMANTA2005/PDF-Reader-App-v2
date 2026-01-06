import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const toast = { id, message, type, duration };

        setToasts(prev => [...prev, toast].slice(-3)); // Keep max 3 toasts

        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toast = {
        success: (message, duration) => addToast(message, 'success', duration),
        error: (message, duration) => addToast(message, 'error', duration),
        warning: (message, duration) => addToast(message, 'warning', duration),
        info: (message, duration) => addToast(message, 'info', duration),
        remove: removeToast
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
};

const ToastContainer = ({ toasts, onRemove }) => {
    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
            <AnimatePresence>
                {toasts.map(toast => (
                    <Toast key={toast.id} toast={toast} onRemove={onRemove} />
                ))}
            </AnimatePresence>
        </div>
    );
};

const Toast = ({ toast, onRemove }) => {
    const { id, message, type } = toast;

    const config = {
        success: {
            icon: <CheckCircle size={20} />,
            bgClass: 'bg-green-500',
            borderClass: 'border-green-600',
            textClass: 'text-white'
        },
        error: {
            icon: <AlertCircle size={20} />,
            bgClass: 'bg-red-500',
            borderClass: 'border-red-600',
            textClass: 'text-white'
        },
        warning: {
            icon: <AlertTriangle size={20} />,
            bgClass: 'bg-yellow-500',
            borderClass: 'border-yellow-600',
            textClass: 'text-white'
        },
        info: {
            icon: <Info size={20} />,
            bgClass: 'bg-blue-500',
            borderClass: 'border-blue-600',
            textClass: 'text-white'
        }
    };

    const { icon, bgClass, borderClass, textClass } = config[type];

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`pointer-events-auto ${bgClass} ${textClass} rounded-xl shadow-2xl border-2 ${borderClass} overflow-hidden max-w-md`}
        >
            <div className="flex items-center gap-3 p-4">
                <div className="flex-shrink-0">
                    {icon}
                </div>
                <p className="flex-1 text-sm font-bold leading-relaxed">{message}</p>
                <button
                    onClick={() => onRemove(id)}
                    className="flex-shrink-0 hover:bg-white/20 rounded-lg p-1 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Progress bar */}
            <motion.div
                className="h-1 bg-white/30"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: toast.duration / 1000, ease: 'linear' }}
            />
        </motion.div>
    );
};

export default ToastProvider;
