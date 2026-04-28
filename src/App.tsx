/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
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
  subscribeToActions
} from './shared/services/inventoryService';
import { auth, googleProvider, db } from './shared/services/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { LogIn as LogInIcon, LogOut as LogOutIcon, User as UserIconLucide, Package as PackageIcon, Eye as EyeIcon, ClipboardList } from 'lucide-react';
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

  const handleNavigate = (tab: string, params?: any) => {
    setNavParams(params || null);
    setActiveTab(tab);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser && !currentUser.isAnonymous && currentUser.uid !== 'visitor') {
        try {
          if (currentUser.email) {
            const docRef = doc(db, 'authorized_users', currentUser.email);
            const docSnap = await getDoc(docRef);
            setIsWhitelisted(docSnap.exists());
          } else {
            setIsWhitelisted(false);
          }
        } catch (error) {
          console.error("Error checking whitelist:", error);
          setIsWhitelisted(false);
        }
      } else if (currentUser?.uid === 'visitor') {
        setIsWhitelisted(true); // Visitor is allowed to see data (read-only)
      } else {
        setIsWhitelisted(null);
      }
      
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Bem-vindo!');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erro ao fazer login com Google.');
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
    await saveSession(session);
  };

  const handleCompleteSession = async (session: InspectionSession) => {
    const completedSession = { ...session, completed: true };
    await saveSession(completedSession);
    setActiveSession(null);
    setActiveTab('dashboard');
    toast.success('Inspeção concluída com sucesso!');

    // Generate corrective actions for non-conforming items
    for (const [itemId, result] of Object.entries(completedSession.results)) {
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
            userId: 'public'
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
    toast.success('Ação corretiva atualizada.');
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

  if (authLoading || loading) {
    return <LoadingScreen message="Inicializando Sistema..." />;
  }

  if (!user || (isWhitelisted === false && !user.isVisitor)) {
    return (
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
            <div className="text-center space-y-1">
              <h2 className="text-[#1E293B] font-semibold text-lg tracking-tight">Gestão de Inventário</h2>
              <p className="text-slate-400 text-sm font-light">Identifique-se para acessar o ecossistema</p>
            </div>
            
            <div className="space-y-4">
              {!isWhitelisted && user && !loading && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mb-4">
                  <div className="flex items-center gap-3 text-amber-800 mb-1">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider">Acesso em Análise</span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Olá <strong>{user.displayName}</strong>, seu e-mail ({user.email}) ainda não foi autorizado para operações de escrita. 
                    Contate o administrador para liberação.
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => auth.signOut()}
                    className="mt-3 h-8 text-[10px] text-amber-900 border border-amber-200 hover:bg-amber-100"
                  >
                    Trocar Conta
                  </Button>
                </div>
              )}

              <Button 
                onClick={handleLogin} 
                disabled={!!(user && !isWhitelisted)}
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
    );
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="wm-saude-theme">
      <TooltipProvider>
        <ConnectivityIndicator />
        <Layout activeTab={activeTab} setActiveTab={handleNavigate} user={user} onLogout={handleLogout}>
          {activeTab === 'dashboard' && (
            <DashboardView 
              sessions={sessions} 
              inventory={inventory} 
              actions={actions}
              onNavigate={handleNavigate}
              onRefresh={handleRefresh}
              isVisitor={user?.isVisitor}
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
            />
          )}
          {activeTab === 'history' && (
            <HistoryView 
              sessions={sessions} 
              onEditSession={handleEditSession}
              isVisitor={user?.isVisitor}
            />
          )}
        </Layout>
        <Toaster position="top-right" richColors />
      </TooltipProvider>
    </ThemeProvider>
  );
}

