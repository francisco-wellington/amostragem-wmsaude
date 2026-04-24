# Sistema de Amostragem - WM Saúde

Uma solução robusta e profissional para auditoria e inventário patrimonial, projetada para otimizar o processo de verificação de ativos em diferentes localidades.

## 🚀 Funcionalidades Principal

- **Dashboard Inteligente**: Acompanhe o status global de conformidade, total de itens auditados e pendências por cidade ou localidade.
- **Configuração de Amostragem Flexível**:
  - **Aleatória (30%)**: Sorteio automático baseado na base de dados.
  - **Completa (100%)**: Inspeção total dos ativos de uma localidade.
  - **Manual**: Seleção específica de patrimônios para verificação única.
- **Fluxo de Inspeção (Checklist)**:
  - Interface otimizada para dispositivos móveis e desktop.
  - Registro de status (Conforme, Não Conforme, Não Localizado, Localização Incorreta).
  - Captura de evidências fotográficas e inserção de notas detalhadas.
- **Gestão de Ações Corretivas**: Rastreie e resolva itens não conformes com um workflow dedicado.
- **Relatórios e Exportação**:
  - Geração de certificados de inspeção em **PDF**.
  - Exportação de dados consolidados em **CSV** para análise externa.
- **Sincronização em Tempo Real**: Baseado em infraestrutura serverless para garantir que os dados estejam sempre atualizados.
- **Segurança**: Autenticação integrada para garantir que apenas inspetores autorizados acessem o sistema.

## 🛠️ Stack Tecnológica

- **Frontend**: [React](https://reactjs.org/) com [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/)
- **Componentes de UI**: [shadcn/ui](https://ui.shadcn.com/)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Firestore & Auth)
- **Gráficos**: [Recharts](https://recharts.org/)
- **Animações**: [Framer Motion](https://www.framer.com/motion/)
- **Ícones**: [Lucide React](https://lucide.dev/)
- **Geração de PDF**: [jsPDF](https://github.com/parallax/jsPDF)

## 🔐 Segurança e Regras de Acesso

O sistema utiliza **Firebase Security Rules** para garantir que:
- Usuários só possam ler e escrever dados após autenticação.
- Existem validações rigorosas de esquema para prevenir dados corrompidos.
- O histórico de inspeções seja imutável após a finalização.

---
Desenvolvido para **WM Saúde**.
