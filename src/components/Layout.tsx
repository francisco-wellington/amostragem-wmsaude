import React from 'react';
import { motion } from 'motion/react';
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
  Moon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OfflineBadge } from './ConnectivityIndicator';
import { useTheme } from './ThemeProvider';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  onLogout: () => void;
}

export default function Layout({ children, activeTab, setActiveTab, user, onLogout }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new-sampling', label: 'Nova Amostragem', icon: PlusCircle, roles: ['admin', 'user'] },
    { id: 'checklist', label: 'Checklist Ativo', icon: ClipboardCheck, roles: ['admin', 'user'] },
    { id: 'corrective-actions', label: 'Ações Corretivas', icon: AlertCircle },
    { id: 'history', label: 'Histórico', icon: History },
  ].filter(item => !user?.isVisitor || !item.roles);

  const { theme, setTheme } = useTheme();

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800"
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center"
            >
              <img 
                src="https://raw.githubusercontent.com/francisco-wellington/logos-wm/ac3c8394a54a53584815e1d98d699464508d3e10/Logo_colorida_new.png" 
                alt="WM Saúde Logo" 
                className="h-10 w-auto"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        <ScrollArea className="flex-1 px-4">
          <nav className="space-y-2 py-4">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
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
                )} />
                {isSidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="font-medium whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </button>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className={cn(
            "flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-800/50",
            !isSidebarOpen && "justify-center px-0"
          )}>
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full border border-slate-700" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
                {user?.displayName?.charAt(0) || 'U'}
              </div>
            )}
            {isSidebarOpen && (
              <div className="flex flex-col overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{user?.displayName || 'Usuário'}</span>
                  {user?.isVisitor && (
                    <span className="text-[8px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded font-bold">VISITANTE</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 truncate">{user?.email}</span>
              </div>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className={cn(
              "w-full text-slate-400 hover:text-red-400 hover:bg-red-400/10 justify-start gap-3",
              !isSidebarOpen && "justify-center px-0"
            )}
          >
            <LogOut className="w-4 h-4" />
            {isSidebarOpen && <span>Sair</span>}
          </Button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0">
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            {menuItems.find(m => m.id === activeTab)?.label}
          </h1>
          <div className="flex items-center gap-6">
             <OfflineBadge />
             <div className="flex items-center gap-4">
               <div className="hidden md:block text-sm text-slate-500 dark:text-slate-400">
                 {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
               </div>
               <Button
                 variant="ghost"
                 size="icon"
                 onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                 className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
               >
                 {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
               </Button>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "mx-auto transition-all duration-500",
              activeTab === 'dashboard' ? "max-w-[1800px]" : "max-w-7xl"
            )}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
