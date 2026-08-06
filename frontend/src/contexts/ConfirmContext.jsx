import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        message: '',
        resolve: null,
    });

    const confirm = useCallback((message) => {
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                message,
                resolve,
            });
        });
    }, []);

    const handleClose = useCallback((value) => {
        setConfirmState((prev) => {
            if (prev.resolve) {
                prev.resolve(value);
            }
            return { ...prev, isOpen: false };
        });
    }, []);

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {confirmState.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => handleClose(false)}>
                    <div
                        className="bg-white dark:bg-neutral-900 rounded-8 shadow-xl w-full max-w-sm overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-5 flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                            </div>
                            <div className="pt-1">
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-slate-100 mb-2">Confirm Action</h3>
                                <p className="text-sm text-neutral-600 dark:text-slate-400">
                                    {confirmState.message}
                                </p>
                            </div>
                        </div>
                        <div className="p-4 bg-neutral-50 dark:bg-slate-900/50 border-t border-neutral-100 dark:border-slate-700 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => handleClose(false)}>Cancel</Button>
                            <Button variant="danger" onClick={() => handleClose(true)}>Confirm</Button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
}
