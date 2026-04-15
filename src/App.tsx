/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import Layout from './components/Layout';
import { 
  InventoryItem, 
  InspectionSession, 
  CorrectiveAction 
} from './types';
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
} from './lib/inventoryService';
import { auth, googleProvider } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { LogIn, LogOut, User as UserIcon, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Views
import DashboardView from './views/DashboardView';
import NewSamplingView from './views/NewSamplingView';
import ChecklistView from './views/ChecklistView';
import CorrectiveActionsView from './views/CorrectiveActionsView';
import HistoryView from './views/HistoryView';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
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
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600 font-medium">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full border-none shadow-2xl bg-white overflow-hidden">
          <div className="h-2 bg-blue-600 w-full" />
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">WM Saúde</CardTitle>
            <CardDescription>Sistema de Amostragem e Inventário</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="text-center space-y-2">
              <p className="text-slate-600">Para acessar o sistema, por favor identifique-se.</p>
            </div>
            <Button 
              onClick={handleLogin} 
              className="w-full h-12 text-lg font-semibold bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-blue-300 transition-all flex items-center justify-center gap-3"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              Entrar com Google
            </Button>
          </CardContent>
          <div className="p-6 bg-slate-50 text-center">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Acesso Restrito</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Layout activeTab={activeTab} setActiveTab={handleNavigate} user={user} onLogout={handleLogout}>
        {activeTab === 'dashboard' && (
          <DashboardView 
            sessions={sessions} 
            inventory={inventory} 
            actions={actions}
            onNavigate={handleNavigate}
            onRefresh={handleRefresh}
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
          />
        )}
        {activeTab === 'corrective-actions' && (
          <CorrectiveActionsView 
            actions={actions} 
            inventory={inventory}
            onUpdateAction={handleUpdateAction}
          />
        )}
        {activeTab === 'history' && (
          <HistoryView 
            sessions={sessions} 
            onEditSession={handleEditSession}
          />
        )}
      </Layout>
      <Toaster position="top-right" richColors />
    </>
  );
}

