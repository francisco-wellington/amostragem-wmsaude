import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  light?: boolean;
}

export function LoadingSpinner({ size = 'md', className, light }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={cn(
        'rounded-full border-t-transparent animate-spin',
        sizeClasses[size],
        light ? 'border-white' : 'border-blue-600',
        className
      )}
    />
  );
}

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Carregando...' }: LoadingScreenProps) {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-white gap-6">
      <div className="relative">
        <LoadingSpinner size="lg" className="border-blue-100" />
        <LoadingSpinner size="lg" className="absolute inset-0" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-2"
      >
        <p className="text-slate-900 font-bold text-lg tracking-tight">{message}</p>
        <p className="text-slate-400 text-sm animate-pulse">Este processo pode levar alguns segundos</p>
      </motion.div>
    </div>
  );
}

interface ButtonLoadingProps {
  loading: boolean;
  success?: boolean;
  children: React.ReactNode;
  loadingText?: string;
  successText?: string;
}

export function ButtonLoading({ loading, success, children, loadingText = 'Sincronizando...', successText = 'Concluido!' }: ButtonLoadingProps) {
  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>{loadingText}</span>
        </motion.div>
      ) : success ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          className="flex items-center gap-2 text-green-600"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{successText}</span>
        </motion.div>
      ) : (
        <motion.div
          key="idle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-2"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface OverlayLoadingProps {
  show: boolean;
  message?: string;
}

export function OverlayLoading({ show, message = 'Gravando alterações...' }: OverlayLoadingProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-sm px-4"
        >
          <Card className="max-w-xs w-full shadow-2xl border-none p-8 flex flex-col items-center gap-6 text-center">
            <div className="relative">
              <LoadingSpinner size="lg" className="border-blue-50" />
              <LoadingSpinner size="lg" className="absolute inset-0" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900">{message}</h3>
              <p className="text-xs text-slate-400">Por favor, não feche esta janela.</p>
            </div>
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
               <motion.div 
                 className="bg-blue-600 h-full w-full"
                 initial={{ x: '-100%' }}
                 animate={{ x: '100%' }}
                 transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
               />
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("bg-white rounded-2xl shadow-sm border border-slate-100", className)}>
            {children}
        </div>
    );
}
