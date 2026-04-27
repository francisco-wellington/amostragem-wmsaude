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
} from '@/components/ui/card';
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
import { auth, googleProvider } from './shared/services/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { LogIn, LogOut, User as UserIcon, Package, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Features
import DashboardView from './features/dashboard/DashboardView';
import NewSamplingView from './features/newsampling/NewSamplingView';
import ChecklistView from './features/checklist/ChecklistView';
import CorrectiveActionsView from './features/corrective/CorrectiveActionsView';
import HistoryView from './features/history/HistoryView';
import { ThemeProvider } from './shared/components/ThemeProvider';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function App() {
  const [user, setUser] = useState<(User & { isVisitor?: boolean }) | null>(null);
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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
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
    // Subscribe to real-time updates for everyone
    const unsubSessions = subscribeToSessions(setSessions);
    const unsubActions = subscribeToActions(setActions);
    
    return () => {
      unsubSessions?.();
      unsubActions?.();
    };
  }, []);

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
      inspectorEmail: user?.email || ''
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

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full border-none shadow-2xl bg-white overflow-hidden">
          <div className="h-2 bg-blue-600 w-full" />
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <img 
                src="https://raw.githubusercontent.com/francisco-wellington/logos-wm/ac3c8394a54a53584815e1d98d699464508d3e10/Logo_azul_new.png" 
                alt="WM Saúde Logo" 
                className="h-20 w-auto"
                referrerPolicy="no-referrer"
              />
            </div>
            <CardDescription>Sistema de Amostragem e Inventário</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="text-center space-y-2">
              <p className="text-slate-600">Para acessar o sistema, por favor identifique-se.</p>
            </div>
            <div className="space-y-3">
              <Button 
                onClick={handleLogin} 
                className="w-full h-12 text-lg font-semibold bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-blue-300 transition-all flex items-center justify-center gap-3"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                Entrar com Google
              </Button>
              
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400">Ou</span>
                </div>
              </div>

              <Button 
                variant="ghost"
                onClick={handleVisitorAccess} 
                className="w-full h-12 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-3"
              >
                <Eye className="w-5 h-5" />
                Acessar como Visitante
              </Button>

              <div className="pt-2">
                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  O modo visitante permite apenas a <strong>visualização de dados</strong>. 
                  A realização de inspeções e edições é restrita a pessoal autorizado via login.
                </p>
              </div>
            </div>
          </CardContent>
          <div className="p-6 bg-slate-50 text-center">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Acesso Restrito</p>
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

