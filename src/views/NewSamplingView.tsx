import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Dices, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Edit3,
  Search
} from 'lucide-react';
import { InventoryItem, InspectionSession } from '../types';
import { generateSample, generateUUID } from '../lib/inventoryService';
import { Textarea } from '@/components/ui/textarea';
import { OverlayLoading } from '../components/LoadingUI';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NewSamplingViewProps {
  inventory: InventoryItem[];
  onStartSession: (session: InspectionSession) => Promise<void>;
  preSelectedCity?: string;
  preSelectedLocality?: string;
}

export default function NewSamplingView({ 
  inventory, 
  onStartSession,
  preSelectedCity = '',
  preSelectedLocality = ''
}: NewSamplingViewProps) {
  const [selectedCity, setSelectedCity] = useState<string>(preSelectedCity);
  const [selectedLocality, setSelectedLocality] = useState<string>(preSelectedLocality);
  const [sampleMode, setSampleMode] = useState<'aleatoria' | 'completo' | 'manual'>('aleatoria');
  const [manualPatrimonies, setManualPatrimonies] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const cities = useMemo(() => {
    const unique = new Set(inventory.map(item => item.Cidade).filter(Boolean));
    return Array.from(unique).sort();
  }, [inventory]);

  const localities = useMemo(() => {
    if (!selectedCity) return [];
    const unique = new Set(
      inventory
        .filter(item => item.Cidade === selectedCity)
        .map(item => item.Localidade)
        .filter(Boolean)
    );
    return Array.from(unique).sort();
  }, [inventory, selectedCity]);

  const filteredItems = useMemo(() => {
    return inventory.filter(item => 
      item.Cidade === selectedCity && 
      item.Localidade === selectedLocality
    );
  }, [inventory, selectedCity, selectedLocality]);

  const totalItems = filteredItems.length;
  const sampleSize = Math.ceil(totalItems * 0.3);

  const handleStart = async () => {
    if (!selectedLocality) {
      setShowValidation(true);
      toast.error('Por favor, selecione uma localidade.');
      return;
    }

    setIsStarting(true);
    try {
      let sample: InventoryItem[] = [];

    if (sampleMode === 'manual') {
      const patrimonyList = manualPatrimonies
        .split(/[\n,;]/)
        .map(p => p.trim())
        .filter(p => p.length > 0);

      if (patrimonyList.length === 0) {
        toast.error('Insira pelo menos um número de patrimônio.');
        return;
      }

      // Find items in the filtered list (by locality) first, then in the whole inventory if needed
      // Actually, user might want to enter patrimonies from ANY locality if they are doing it manually?
      // But the prompt says "select locality, then manual". 
      // Let's search in the whole inventory but filter by locality if selected?
      // No, let's search in the whole inventory to be more flexible, but warn if not in locality.
      
      const foundItems: InventoryItem[] = [];
      const notFound: string[] = [];

      patrimonyList.forEach(p => {
        const item = inventory.find(i => i.Patrimônio === p);
        if (item) {
          foundItems.push(item);
        } else {
          notFound.push(p);
        }
      });

      if (notFound.length > 0) {
        toast.error(`Patrimônios não encontrados: ${notFound.join(', ')}`);
        return;
      }

      sample = foundItems;
    } else {
      sample = generateSample(filteredItems, sampleMode);
    }
    
    const session: InspectionSession = {
      id: generateUUID(),
      locality: selectedLocality || 'Manual - Diversas',
      city: selectedCity,
      date: new Date().toISOString(),
      sampleMode,
      items: sample,
      results: {},
      completed: false
    };

    await onStartSession(session);
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error);
      toast.error('Erro ao preparar amostragem.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-900">Configurar Nova Amostragem</h2>
        <p className="text-slate-500">Selecione a localidade e o método de sorteio para iniciar a auditoria.</p>
      </div>

      <Card className="border-none shadow-lg bg-white overflow-hidden">
        <div className="h-2 bg-blue-600 w-full" />
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Parâmetros da Inspeção</CardTitle>
          <CardDescription>Defina onde e como a amostragem será realizada.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* City Selection */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label htmlFor="city" className="text-sm font-semibold text-slate-700">
                Cidade <span className="text-red-500">*</span>
              </Label>
              {showValidation && !selectedCity && (
                <span className="text-[10px] font-bold text-red-500 uppercase">Obrigatório</span>
              )}
            </div>
            <Select 
              value={selectedCity} 
              onValueChange={(val) => {
                setSelectedCity(val);
                setSelectedLocality(''); // Reset locality when city changes
                if (val) setShowValidation(false);
              }}
            >
              <SelectTrigger 
                id="city" 
                className={cn(
                  "h-12 text-lg transition-all",
                  showValidation && !selectedCity ? "border-red-300 bg-red-50" : ""
                )}
              >
                <SelectValue placeholder="Selecione uma cidade..." />
              </SelectTrigger>
              <SelectContent>
                {cities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Locality Selection */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label htmlFor="locality" className="text-sm font-semibold text-slate-700">
                Localidade <span className="text-red-500">*</span>
              </Label>
              {showValidation && !selectedLocality && (
                <span className="text-[10px] font-bold text-red-500 uppercase">Obrigatório</span>
              )}
            </div>
            <Select 
              value={selectedLocality} 
              onValueChange={(val) => {
                setSelectedLocality(val);
                if (val) setShowValidation(false);
              }}
              disabled={!selectedCity}
            >
              <SelectTrigger 
                id="locality" 
                className={cn(
                  "h-12 text-lg transition-all",
                  showValidation && !selectedLocality ? "border-red-300 bg-red-50" : ""
                )}
              >
                <SelectValue placeholder={selectedCity ? "Selecione uma localidade..." : "Selecione primeiro a cidade"} />
              </SelectTrigger>
              <SelectContent>
                {localities.map(loc => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedLocality && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total de Itens</span>
                <span className="text-2xl font-bold text-slate-900">{totalItems}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                  {sampleMode === 'completo' ? 'Total de Itens' : 'Tamanho da Amostra (30%)'}
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  {sampleMode === 'completo' ? totalItems : sampleSize}
                </span>
              </div>
            </div>
          )}

          {/* Sample Mode Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-700">Método de Amostragem</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setSampleMode('aleatoria')}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all text-center ${
                  sampleMode === 'aleatoria' 
                    ? 'border-blue-600 bg-blue-50/50' 
                    : 'border-slate-100 hover:border-slate-200 bg-white'
                }`}
              >
                <div className={`p-3 rounded-lg ${sampleMode === 'aleatoria' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Dices className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Aleatória</p>
                  <p className="text-[10px] text-slate-500 mt-1">Sorteio de 30% dos itens.</p>
                </div>
              </button>

              <button
                onClick={() => setSampleMode('completo')}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all text-center ${
                  sampleMode === 'completo' 
                    ? 'border-blue-600 bg-blue-50/50' 
                    : 'border-slate-100 hover:border-slate-200 bg-white'
                }`}
              >
                <div className={`p-3 rounded-lg ${sampleMode === 'completo' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Completo</p>
                  <p className="text-[10px] text-slate-500 mt-1">Inspeção de 100% dos itens.</p>
                </div>
              </button>

              <button
                onClick={() => setSampleMode('manual')}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all text-center ${
                  sampleMode === 'manual' 
                    ? 'border-blue-600 bg-blue-50/50' 
                    : 'border-slate-100 hover:border-slate-200 bg-white'
                }`}
              >
                <div className={`p-3 rounded-lg ${sampleMode === 'manual' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Manual</p>
                  <p className="text-[10px] text-slate-500 mt-1">Inserir patrimônios à mão.</p>
                </div>
              </button>
            </div>
          </div>

          {sampleMode === 'manual' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3"
            >
              <Label htmlFor="manual-patrimonies" className="text-sm font-semibold text-slate-700">
                Números de Patrimônio
              </Label>
              <div className="relative">
                <Textarea
                  id="manual-patrimonies"
                  placeholder="Digite os números de patrimônio separados por linha ou vírgula..."
                  className="min-h-[120px] pt-10"
                  value={manualPatrimonies}
                  onChange={(e) => setManualPatrimonies(e.target.value)}
                />
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              </div>
              <p className="text-[10px] text-slate-500">
                Ex: 12345, 67890, 11223 (Um por linha ou separado por vírgula)
              </p>
            </motion.div>
          )}
        </CardContent>
        <CardFooter className="bg-slate-50 p-6 flex justify-end">
          <Button 
            size="lg" 
            className={cn(
              "px-8 h-12 text-lg font-semibold shadow-lg transition-all",
              !selectedLocality 
                ? "bg-slate-200 text-slate-500 cursor-not-allowed grayscale" 
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
            )}
            onClick={handleStart}
          >
            Gerar Amostra e Iniciar
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </CardFooter>
      </Card>

      <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100 text-blue-800 text-sm">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p>
          <strong>Dica:</strong> A inspeção completa é recomendada para auditorias de encerramento de ciclo ou inventários anuais.
        </p>
      </div>

      <OverlayLoading show={isStarting} message="Gerando amostragem e preparando checklist..." />
    </div>
  );
}
