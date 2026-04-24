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

## 📋 Pré-requisitos

Antes de começar, você precisará ter instalado em sua máquina:
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- NPM ou Yarn

## 🔧 Instalação e Execução

1. **Clone o repositório**
   ```bash
   git clone <url-do-repositorio>
   cd <nome-do-diretorio>
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configuração de Ambiente**
   Crie um arquivo `.env` na raiz do projeto e adicione suas credenciais do Firebase (veja o arquivo `.env.example` como referência).

4. **Inicie o servidor de desenvolvimento**
   ```bash
   npm run dev
   ```

5. **Build para produção**
   ```bash
   npm run build
   ```

## 🔐 Segurança e Regras de Acesso

O sistema utiliza **Firebase Security Rules** para garantir que:
- Usuários só possam ler e escrever dados após autenticação.
- Existem validações rigorosas de esquema para prevenir dados corrompidos.
- O histórico de inspeções seja imutável após a finalização.

---
Desenvolvido para **WM Saúde**.
