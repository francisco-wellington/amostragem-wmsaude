import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, CloudUpload, CloudOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export function ConnectivityIndicator() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      toast.success('Conexão restabelecida! Sincronizando dados...', {
        icon: <CloudUpload className="w-4 h-4 text-green-500" />,
      });
      setTimeout(() => setShowStatus(false), 5000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
      toast.error('Você está offline. Alterações serão salvas localmente.', {
        icon: <CloudOff className="w-4 h-4 text-red-500" />,
        duration: 8000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {(showStatus || !isOnline) && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className={cn(
            "fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full shadow-lg border flex items-center gap-3 transition-colors",
            isOnline 
              ? "bg-green-50 border-green-200 text-green-800" 
              : "bg-red-50 border-red-200 text-red-800"
          )}
        >
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Online • Sincronizado</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">Offline • Modo de Segurança</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function OfflineBadge() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-md text-[10px] font-bold uppercase border border-red-200">
      <CloudOff className="w-3 h-3" />
      <span>Modo Offline</span>
    </div>
  );
}
