import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  History, 
  AlertCircle, 
  PlusCircle,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  Download,
  Smartphone
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import { OfflineBadge } from './ConnectivityIndicator';
import { useTheme } from './ThemeProvider';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  onLogout: () => void;
  isMonitorMode?: boolean;
}

export default function Layout({ children, activeTab, setActiveTab, user, onLogout, isMonitorMode = false }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);

  // Close mobile menu when tab changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Initial check for iOS PWA eligibility
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    if (isIos && !isStandalone) {
      setIsInstallable(true);
    } else if (isStandalone) {
      setIsInstallable(false);
    }

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIos) {
      setShowIosTip(true);
      return;
    }

    if (!deferredPrompt) {
      alert("Para instalar, basta tocar no ícone de três pontos (ou menu do seu navegador) e selecionar 'Adicionar à Tela Inicial' ou 'Instalar Aplicativo'.");
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn("PWA prompt failed:", err);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new-sampling', label: 'Nova Amostragem', icon: PlusCircle, roles: ['admin', 'user'] },
    { id: 'checklist', label: 'Checklist Ativo', icon: ClipboardCheck, roles: ['admin', 'user'] },
    { id: 'corrective-actions', label: 'Ações Corretivas', icon: AlertCircle },
    { id: 'history', label: 'Histórico', icon: History },
  ].filter(item => !user?.isVisitor || !item.roles);

  const { theme, setTheme } = useTheme();

  const SidebarContent = () => (
    <>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center">
          <img 
            src="https://raw.githubusercontent.com/francisco-wellington/logos-wm/ac3c8394a54a53584815e1d98d699464508d3e10/Logo_colorida_new.png" 
            alt="WM Saúde Logo" 
            className={cn("h-10 w-auto transition-all", !isSidebarOpen && "lg:h-6")}
            referrerPolicy="no-referrer"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => isMobileMenuOpen ? setIsMobileMenuOpen(false) : setIsSidebarOpen(!isSidebarOpen)}
          className="text-slate-400 hover:text-white hover:bg-slate-800 lg:flex hidden"
          aria-label={isSidebarOpen ? "Recolher menu lateral" : "Expandir menu lateral"}
        >
          {isSidebarOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(false)}
          className="text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden flex"
          aria-label="Fechar menu mobile"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4">
        <nav className="space-y-2 py-4" aria-label="Menu principal">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-current={activeTab === item.id ? 'page' : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                activeTab === item.id 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 shrink-0",
                activeTab === item.id ? "text-white" : "text-slate-400 group-hover:text-slate-100"
              )} aria-hidden="true" />
              <span className={cn(
                "font-medium whitespace-nowrap transition-all duration-300",
                !isSidebarOpen ? "lg:opacity-0 lg:w-0" : "opacity-100 w-auto"
              )}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t border-slate-800 space-y-2">
        {isInstallable && (
          <div className={cn(
            "p-3 rounded-xl bg-slate-800/40 border border-slate-800/80 flex flex-col gap-2.5 mb-2",
            !isSidebarOpen && "lg:p-1 lg:items-center lg:mx-0"
          )}>
            <div className={cn("flex items-center gap-2", !isSidebarOpen && "lg:justify-center")}>
              <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
                <Smartphone className="w-4 h-4" />
              </div>
              {isSidebarOpen && (
                <div className="flex flex-col overflow-hidden text-left">
                  <span className="text-xs font-bold text-slate-250 text-slate-200">App Móvel</span>
                  <span className="text-[10px] text-slate-500 leading-none">Instalar para uso offline</span>
                </div>
              )}
            </div>
            <Button 
              size="sm" 
              onClick={handleInstallClick}
              className={cn(
                "w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 flex items-center justify-center gap-1.5 rounded-lg active:scale-95 transition-all text-center",
                !isSidebarOpen && "lg:p-0 lg:h-8 lg:w-8 lg:min-w-0"
              )}
              title="Instalar Aplicativo"
            >
              <Download className="w-3.5 h-3.5" />
              {isSidebarOpen && <span>Instalar</span>}
            </Button>
          </div>
        )}

        <div className={cn(
          "flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-800/50 overflow-hidden",
          !isSidebarOpen && "lg:justify-center lg:px-0"
        )}>
          {user?.photoURL ? (
            <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 shrink-0 rounded-full border border-slate-700" />
          ) : (
            <div className="w-8 h-8 shrink-0 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
              {user?.displayName?.charAt(0) || 'U'}
            </div>
          )}
          <div className={cn(
            "flex flex-col overflow-hidden transition-all duration-300",
            !isSidebarOpen ? "lg:opacity-0 lg:w-0" : "opacity-100 w-auto"
          )}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{user?.displayName || 'Usuário'}</span>
              {user?.isVisitor && (
                <span className="text-[8px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded font-bold">VISITANTE</span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 truncate">{user?.email}</span>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className={cn(
            "w-full text-slate-400 hover:text-red-400 hover:bg-red-400/10 justify-start gap-3",
            !isSidebarOpen && "lg:justify-center lg:px-0"
          )}
        >
          <LogOut className="w-4 h-4" />
          <span className={cn(
            "transition-all duration-300",
            !isSidebarOpen ? "lg:opacity-0 lg:w-0" : "opacity-100 w-auto"
          )}>Sair</span>
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Desktop Sidebar */}
      {!isMonitorMode && (
        <motion.aside
          initial={false}
          animate={{ width: isSidebarOpen ? 280 : 80 }}
          className="bg-slate-900 text-slate-100 lg:flex flex-col border-r border-slate-800 hidden"
        >
          <SidebarContent />
        </motion.aside>
      )}

      {/* Mobile Drawer */}
      <AnimatePresence>
        {!isMonitorMode && isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-slate-900 text-slate-100 flex flex-col z-50 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {!isMonitorMode && (
          <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8 shrink-0">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden text-slate-500 hover:text-blue-600 dark:text-slate-400"
              >
                <Menu className="w-6 h-6" />
              </Button>
              <h1 className="text-lg sm:text-xl font-bold sm:font-semibold text-[#1E293B] dark:text-slate-100 flex items-center gap-2">
                <span className="lg:hidden p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  {React.createElement(menuItems.find(m => m.id === activeTab)?.icon || LayoutDashboard, { className: "w-5 h-5 text-blue-600 dark:text-blue-400" })}
                </span>
                {menuItems.find(m => m.id === activeTab)?.label}
              </h1>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-6">
               <div className="hidden sm:block">
                 <OfflineBadge />
               </div>
               <div className="flex items-center gap-2 sm:gap-4">
                  {isInstallable && (
                    <Button
                      onClick={handleInstallClick}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] px-2.5 py-1.5 h-8 gap-1.5 rounded-lg shrink-0 transition-all flex items-center shadow-md shadow-blue-600/10 active:scale-95 text-center cursor-pointer mr-1"
                      title="Instalar Aplicativo de Inventário"
                      aria-label="Instalar aplicativo"
                    >
                      <Download className="w-3.5 h-3.5 animate-bounce" style={{ animationDuration: '3s' }} />
                      <span className="hidden sm:inline">Baixar App</span>
                    </Button>
                  )}
                 <div className="hidden xl:block text-sm text-slate-500 dark:text-slate-400">
                   {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                 </div>
                 <Button
                   variant="ghost"
                   size="icon"
                   onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                   className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                   aria-label={theme === 'dark' ? "Ativar modo claro" : "Ativar modo escuro"}
                 >
                   {theme === 'dark' ? <Sun className="w-5 h-5" aria-hidden="true" /> : <Moon className="w-5 h-5" aria-hidden="true" />}
                 </Button>
               </div>
            </div>
          </header>
        )}

        <div className={cn("flex-1 overflow-auto p-4 sm:p-6 lg:p-8", isMonitorMode && "p-4 sm:p-6")}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "mx-auto transition-all duration-500",
              ['dashboard', 'corrective-actions', 'history', 'checklist'].includes(activeTab) ? "max-w-[2000px]" : "max-w-7xl"
            )}
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Modal especial de dica do iOS */}
      <AnimatePresence>
        {showIosTip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowIosTip(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 text-slate-800 dark:text-slate-100"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl relative"
            >
              <button
                onClick={() => setShowIosTip(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="mx-auto w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center rounded-2xl mb-4 font-bold text-lg">
                iOS
              </div>
              
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">WM Saúde no iOS</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Para instalar a plataforma e utilizá-la em tela cheia na sua tela de início, siga estes passos rápidos:
              </p>
              
              <div className="space-y-4 text-left bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 mb-6">
                <div className="flex gap-3 items-start">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold shrink-0 mt-0.5">1</span>
                  <p className="text-xs text-[#1E293B] dark:text-slate-300 leading-normal">
                    Abra esta página no navegador <strong className="font-semibold text-[#0B4DA2] dark:text-[#3FA9F5]">Safari</strong>.
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold shrink-0 mt-0.5">2</span>
                  <p className="text-xs text-[#1E293B] dark:text-slate-300 leading-normal">
                    Toque no botão de <strong className="font-semibold">Compartilhar</strong> (ícone de quadrado com flecha pra cima na barra de ferramentas).
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold shrink-0 mt-0.5">3</span>
                  <p className="text-xs text-[#1E293B] dark:text-slate-300 leading-normal">
                    Role as opções e toque em <strong className="font-bold text-blue-600 dark:text-blue-400">Adicionar à Tela de Início</strong>.
                  </p>
                </div>
              </div>

              <Button 
                onClick={() => setShowIosTip(false)}
                className="w-full bg-[#0B4DA2] hover:bg-[#0B4DA2]/90 text-white font-bold text-xs py-2.5 h-10 rounded-xl transition-all active:scale-[0.98]"
              >
                Entendi
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

