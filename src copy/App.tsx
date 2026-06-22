/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import Layout from './shared/components/Layout';
import { ConnectivityIndicator } from './shared/components/ConnectivityIndicator';
import { LoadingScreen } from './shared/components/LoadingUI';
import { 
  InventoryItem, 
  InspectionSession, 
  CorrectiveAction 
} from './shared/types';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from './components/ui/card';
import { 
  fetchInventoryData, 
  saveSession,
  deleteSession,
  saveAction,
  updateAction,
  generateUUID,
  subscribeToSessions,
  subscribeToActions,
  getLocalDraftsByUser
} from './shared/services/inventoryService';
import { auth, googleProvider, db } from './shared/services/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { LogIn as LogInIcon, LogOut as LogOutIcon, User as UserIconLucide, Package as PackageIcon, Eye as EyeIcon, ClipboardList, X as CloseIcon, AlertCircle, ShieldAlert, RefreshCw } from 'lucide-react';
import { Button } from './components/ui/button';

// Features
import DashboardView from './features/dashboard/DashboardView';
import NewSamplingView from './features/newsampling/NewSamplingView';
import ChecklistView from './features/checklist/ChecklistView';
import CorrectiveActionsView from './features/corrective/CorrectiveActionsView';
import HistoryView from './features/history/HistoryView';
import { ThemeProvider } from './shared/components/ThemeProvider';
import { TooltipProvider } from './components/ui/tooltip';

export default function App() {
  const [user, setUser] = useState<(User & { isVisitor?: boolean }) | null>(null);
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [navParams, setNavParams] = useState<any>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sessions, setSessions] = useState<InspectionSession[]>([]);
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [activeSession, setActiveSession] = useState<InspectionSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMonitorMode, setIsMonitorMode] = useState(false);

  const handleNavigate = (tab: string, params?: any) => {
    setNavParams(params || null);
    setActiveTab(tab);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      
      if (currentUser && !currentUser.isAnonymous && currentUser.uid !== 'visitor') {
        try {
          if (currentUser.email) {
            const emailLower = currentUser.email.toLowerCase();
            const emailExact = currentUser.email;
            
            // Try lowercase first
            let docRef = doc(db, 'authorized_users', emailLower);
            let docSnap = await getDoc(docRef);
            
            // If not found and the original email was different (contained caps), try exact
            if (!docSnap.exists() && emailExact !== emailLower) {
              docRef = doc(db, 'authorized_users', emailExact);
              docSnap = await getDoc(docRef);
            }
            
            const exists = docSnap.exists();
            setIsWhitelisted(exists);
            setUser(currentUser);
            
            if (exists) {
              toast.success(`Bem-vindo, ${currentUser.displayName}!`);
            } else {
              console.warn(`Email ${currentUser.email} not found in authorized_users collection.`);
            }
          } else {
            setIsWhitelisted(false);
            setUser(currentUser);
          }
        } catch (error) {
          console.error("Error checking whitelist:", error);
          setIsWhitelisted(false);
          setUser(currentUser);
        }
      } else if (currentUser?.uid === 'visitor') {
        setIsWhitelisted(true);
        setUser(currentUser);
      } else {
        setIsWhitelisted(null);
        setUser(null);
      }
      
      setAuthLoading(false);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erro ao fazer login com Google.');
      setLoading(false);
    }
  };

  const handleVisitorAccess = () => {
    setUser({
      uid: 'visitor',
      displayName: 'Visitante',
      email: 'visitante@wmsaude.com.br',
      photoURL: null,
      isVisitor: true
    } as any);
    toast.info('Acessando em modo de visualização.');
  };

  const handleLogout = async () => {
    try {
      if (user?.isVisitor) {
        setUser(null);
      } else {
        await signOut(auth);
      }
      setActiveTab('dashboard');
      toast.info('Sessão encerrada.');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Check for abandoned draft sessions in IndexedDB to offer recovery
    const checkRecoverableSession = async () => {
      const drafts = await getLocalDraftsByUser(user.uid);
      const incomplete = drafts.filter(d => !d.completed);
      
      if (incomplete.length > 0 && !activeSession) {
        const mostRecent = incomplete.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0];
        
        toast('Sessão em andamento encontrada', {
          description: `Deseja retomar a auditoria de ${mostRecent.locality}?`,
          action: {
            label: 'Retomar',
            onClick: () => {
              setActiveSession(mostRecent);
              setActiveTab('checklist');
            },
          },
          duration: 10000,
        });
      }
    };
    
    checkRecoverableSession();

    // Subscribe to real-time updates for everyone (real user or visitor)
    const unsubSessions = subscribeToSessions(setSessions);
    const unsubActions = subscribeToActions(setActions);
    
    return () => {
      unsubSessions?.();
      unsubActions?.();
    };
  }, [user]);

  useEffect(() => {
    async function init() {
      try {
        const data = await fetchInventoryData();
        setInventory(data);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Erro ao carregar dados da planilha.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleStartSession = async (session: InspectionSession) => {
    const sessionWithInspector = {
      ...session,
      inspectorName: user?.displayName || 'Desconhecido',
      inspectorEmail: user?.email || '',
      userId: user?.uid || ''
    };
    setActiveSession(sessionWithInspector);
    await saveSession(sessionWithInspector);
    setActiveTab('checklist');
    toast.success('Inspeção iniciada!');
  };

  const handleUpdateSession = async (session: InspectionSession) => {
    setActiveSession(session);
    setIsSyncing(true);
    try {
      await saveSession(session);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCompleteSession = async (session: InspectionSession) => {
    const completedSession = { ...session, completed: true };
    await saveSession(completedSession);
    setActiveSession(null);
    setActiveTab('dashboard');
    toast.success('Inspeção concluída com sucesso!');

    // Generate corrective actions for non-conforming items
    const results = completedSession.results || {};
    for (const [itemId, result] of Object.entries(results)) {
      if (result.status !== 'conforme') {
        const item = completedSession.items.find(i => i.Patrimônio === itemId);
        if (item) {
          const action: CorrectiveAction = {
            id: generateUUID(),
            sessionId: completedSession.id,
            patrimony: item.Patrimônio,
            description: `Não conformidade em ${item.Localidade}: ${item.Descrição}`,
            locality: item.Localidade,
            city: item.Cidade || completedSession.city,
            date: new Date().toISOString(),
            resolved: false,
            notes: result.notes,
            userId: user?.uid || 'public'
          };
          await saveAction(action);
        }
      }
    }
  };

  const handleExitSession = () => {
    setActiveSession(null);
    setActiveTab('dashboard');
    toast.info('Rascunho atualizado e sessão suspensa.');
  };

  const handleCancelSession = async () => {
    if (activeSession) {
      await deleteSession(activeSession.id);
    }
    setActiveSession(null);
    setActiveTab('dashboard');
    toast.error('Inspeção cancelada e registro removido.');
  };

  const handleUpdateAction = async (action: CorrectiveAction) => {
    await updateAction(action);
    
    // Se a ação foi resolvida, atualizar o status do item correspondente na sessão
    if (action.resolved) {
      // 1. Atualizar activeSession se for a sessão correspondente
      if (activeSession && activeSession.id === action.sessionId) {
        const result = activeSession.results[action.patrimony];
        if (result && result.status !== 'conforme') {
          setActiveSession({
            ...activeSession,
            results: {
              ...activeSession.results,
              [action.patrimony]: {
                ...result,
                status: 'conforme',
                notes: (result.notes ? `${result.notes}\n` : '') + `[Ação Corretiva Resolvida em ${new Date().toLocaleDateString('pt-BR')}]`
              }
            }
          });
        }
      }

      // 2. Atualizar no Firestore (o estado sessions será atualizado via onSnapshot)
      const sessionToUpdate = sessions.find(s => s.id === action.sessionId);
      if (sessionToUpdate) {
        const result = sessionToUpdate.results[action.patrimony];
        if (result && result.status !== 'conforme') {
          const updatedSession: InspectionSession = {
            ...sessionToUpdate,
            results: {
              ...sessionToUpdate.results,
              [action.patrimony]: {
                ...result,
                status: 'conforme',
                notes: (result.notes ? `${result.notes}\n` : '') + `[Ação Corretiva Resolvida em ${new Date().toLocaleDateString('pt-BR')}]`
              }
            }
          };
          await saveSession(updatedSession);
        }
      }
    }
    
    toast.success('Ação corretiva atualizada.');
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      toast.success('Inspeção excluída do histórico.');
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const handleEditSession = (session: InspectionSession) => {
    setActiveSession(session);
    setActiveTab('checklist');
    toast.info('Retomando inspeção para edição.');
  };

  const handleRefresh = async () => {
    try {
      const data = await fetchInventoryData();
      setInventory(data);
      toast.success('Dados sincronizados com a planilha!');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Erro ao sincronizar dados.');
    }
  };

  // Only show full loader for auth initialization
  if (authLoading) {
    return <LoadingScreen message="Autenticando..." />;
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="wm-saude-theme">
      <TooltipProvider>
        {(!user || (isWhitelisted === false && !user.isVisitor)) ? (
          <div className="h-screen w-screen flex items-center justify-center bg-[#F7F9FC] relative overflow-hidden p-4">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#3FA9F5]/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#0B4DA2]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            
            {/* Subtle Tech Pattern Grid Effect */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
              style={{ 
                backgroundImage: 'radial-gradient(circle, #0B4DA2 1px, transparent 1px)', 
                backgroundSize: '30px 30px' 
              }} 
            />

            <Card className="max-w-md w-full border-none shadow-[0_20px_50px_rgba(0,0,0,0.08)] bg-white overflow-hidden relative z-10 transition-all duration-500 hover:shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                <div className="h-[5px] w-full bg-gradient-to-r from-[#0B4DA2] via-[#3FA9F5] to-[#0B4DA2]" />
                <CardHeader className="text-center pt-12 pb-0">
                  <div className="mx-auto flex items-center justify-center mb-0 px-8">
                    <img 
                      src="https://raw.githubusercontent.com/francisco-wellington/logos-wm/ac3c8394a54a53584815e1d98d699464508d3e10/Logo_azul_new.png" 
                      alt="WM Saúde Logo" 
                      className="h-24 w-auto object-contain transition-transform duration-500 hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </CardHeader>
            <CardContent className="space-y-6 px-10 pb-10">
                <div className="text-center space-y-0.5">
                  <h2 className="text-[#1E293B] font-semibold text-lg tracking-tight">Gestão de Inventário</h2>
                  <p className="text-slate-400 text-xs font-light">Identifique-se para acessar o ecossistema</p>
                </div>
                
                <div className="space-y-4">
                  {isWhitelisted === false && user && !loading && (
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mb-4 text-left">
                      <div className="flex items-center gap-3 text-amber-800 mb-1">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Acesso em Análise</span>
                      </div>
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        Olá <strong>{user.displayName}</strong>, seu e-mail ({user.email}) ainda não foi autorizado para operações de escrita. 
                        Contate o administrador para liberação.
                      </p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleLogout}
                        className="mt-3 h-8 text-[10px] text-amber-900 border border-amber-200 hover:bg-amber-100 w-full"
                      >
                        Trocar Conta
                      </Button>
                    </div>
                  )}

                  <Button 
                    onClick={handleLogin} 
                    disabled={!!(user && isWhitelisted === false)}
                    className="w-full h-13 text-base font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-[#3FA9F5] hover:text-[#0B4DA2] shadow-sm transition-all flex items-center justify-center gap-3 rounded-xl group disabled:opacity-50"
                  >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all" />
                    Entrar com Google Workspace
                  </Button>
                  
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-100" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                      <span className="bg-white px-4 text-slate-300">Conexão Segura</span>
                    </div>
                  </div>

                  <Button 
                    variant="ghost"
                    onClick={handleVisitorAccess} 
                    className="w-full h-12 text-slate-400 hover:text-[#0B4DA2] hover:bg-[#3FA9F5]/10 font-medium transition-all flex items-center justify-center gap-2 rounded-xl"
                  >
                    <EyeIcon className="w-4 h-4" />
                    Acessar como Visitante
                  </Button>

                  <div className="pt-4 border-t border-slate-50">
                    <p className="text-[11px] text-slate-400 text-center leading-relaxed font-light">
                      <span className="text-[#0B4DA2] font-semibold opacity-80">Aviso:</span> O modo visitante permite apenas a visualização de indicadores. 
                      Operações críticas exigem credenciais institucionais.
                    </p>
                  </div>
                </div>
              </CardContent>
              <div className="py-4 bg-[#F8FAFC] border-t border-[#F1F5F9] text-center flex items-center justify-center gap-2">
                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                 <p className="text-[9px] text-[#1E293B]/40 uppercase font-bold tracking-[0.2em]">Servidor Ativo • v2.0</p>
              </div>
            </Card>
          </div>
        ) : (
          <>
            <ConnectivityIndicator />
            <Layout activeTab={activeTab} setActiveTab={handleNavigate} user={user} onLogout={handleLogout} isMonitorMode={isMonitorMode}>
              {activeTab === 'dashboard' && (
                <DashboardView 
                  sessions={sessions} 
                  inventory={inventory} 
                  actions={actions}
                  onNavigate={handleNavigate}
                  onRefresh={handleRefresh}
                  isVisitor={user?.isVisitor}
                  isLoading={loading}
                  isMonitorMode={isMonitorMode}
                  onToggleMonitorMode={() => setIsMonitorMode(!isMonitorMode)}
                />
              )}
              {activeTab === 'new-sampling' && (
                <NewSamplingView 
                  inventory={inventory} 
                  onStartSession={handleStartSession} 
                  preSelectedCity={navParams?.city}
                  preSelectedLocality={navParams?.locality}
                  userId={user?.uid || ''}
                />
              )}
              {activeTab === 'checklist' && (
                <ChecklistView 
                  session={activeSession} 
                  onUpdateSession={handleUpdateSession}
                  onCompleteSession={handleCompleteSession}
                  onCancelSession={handleCancelSession}
                  onExitSession={handleExitSession}
                />
              )}
              {activeTab === 'corrective-actions' && (
                <CorrectiveActionsView 
                  actions={actions} 
                  inventory={inventory}
                  onUpdateAction={handleUpdateAction}
                  isVisitor={user?.isVisitor}
                  isLoading={loading}
                />
              )}
              {activeTab === 'history' && (
                <HistoryView 
                  sessions={sessions} 
                  onEditSession={handleEditSession}
                  onDeleteSession={handleDeleteSession}
                  isVisitor={user?.isVisitor}
                  isLoading={loading}
                />
              )}
            </Layout>
          </>
        )}
        <Toaster position="top-right" richColors />
        <div className="fixed bottom-4 left-4 z-[100]">
          <AnimatePresence>
            {isSyncing && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-full shadow-lg flex items-center gap-2"
              >
                <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter pr-1">Sincronizando...</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}

