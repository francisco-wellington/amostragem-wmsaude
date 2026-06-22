# 📋 Manual de Operação e Conceitos: Plataforma WM Saúde

Este documento apresenta uma visão clara e objetiva de como a plataforma de auditoria e monitoramento de equipamentos da **WM Saúde** funciona. Ele foi projetado para gestores, auditores e técnicos entenderem as engrenagens do sistema, suas funcionalidades e como ele simplifica o controle de qualidade dos ativos tecnológicos no estado do Piauí.

---

## 🔗 Links Oficiais de Acesso

Para visualizar ou operar a plataforma descrita neste manual, utilize os links oficiais abaixo:

* **🌐 Plataforma Publicada (Shared App):** [https://ais-pre-o5vhjs4ft5j36lkziqz7fs-182613989039.us-west2.run.app](https://ais-pre-o5vhjs4ft5j36lkziqz7fs-182613989039.us-west2.run.app)
* **🧪 Ambiente de Homologação (Development App):** [https://ais-dev-o5vhjs4ft5j36lkziqz7fs-182613989039.us-west2.run.app](https://ais-dev-o5vhjs4ft5j36lkziqz7fs-182613989039.us-west2.run.app)

---

Para facilitar a compreensão, utilizaremos a analogia de uma **Linha de Controle de Qualidade de uma Grande Indústria**, onde cada engrenagem trabalha em sincronia para garantir que o product final (o serviço prestado ao cidadão) nunca seja interrompido.

---

## ⚙️ 1. O Inventário Geral: A Base de Tudo

Toda operação robusta de controle de qualidade precisa saber exatamente o que possui, onde está e quem é responsável por cada item. 

* **O Ativo (Patrimônio):** Cada equipamento (como tablets) possui uma etiqueta de patrimônio física irreversível. No sistema, essa etiqueta funciona como a "impressão digital" ou o código único do ativo.
* **A Localidade (UBS / Município):** São as estações de trabalho distribuídas em todo o estado. Cada ativo pertence a uma estação registrada em contrato.

---

## 🎲 2. Geração de Amostragem: Otimizando Recursos no Campo

Inspecionar todos os milhares de tablets do estado, um por um, todos os dias de forma exaustiva é operacionalmente inviável e caro. Por isso, a plataforma conta com uma **Engenharia de Amostragem Inteligente** na aba *Nova Amostragem*.

Para entender como economizamos tempo, pense em um **Exame de Qualidade em Bateladas de Alimentos**: você não precisa provar todas as maçãs de uma caixa para garantir que o lote está excelente; você seleciona uma amostra aleatória e as inspeciona.

O sistema dispõe de três métodos para atingir esse objetivo:

1. **Amostragem Aleatória (30%):** O algoritmo sorteia estatisticamente 30% dos equipamentos ativos de uma determinada unidade. Se esses 30% forem auditados e apresentarem conformidade, as leis estatísticas nos dão uma alta confiança de que o lote inteiro da unidade está operando sem falhas. Isso reduz em 70% o tempo gasto pelos fiscais em viagens e manuseio!
2. **Amostragem Completa (100%):** Um censo total da unidade. Todos os equipamentos são obrigatoriamente incluídos na listagem para auditorias contratuais rígidas ou quando a unidade atinge níveis de alerta.
3. **Amostragem Manual (Focada):** O gestor seleciona manualmente e de forma pontual quais equipamentos específicos deseja inspecionar para atender a uma manutenção programada ou averiguação de rotina.

---

## 📝 3. O Checklist de Inspeção: Definindo Diagnósticos

Quando o auditor chega à Unidade de Saúde (UBS), ele abre o aplicativo e inicia a contagem e verificação da amostragem selecionada. Ele analisa o funcionamento físico de cada tablet e atribui um dos quatro status de regularidade:

* **🟢 CONFORME:** O equipamento está completo, com sistema operacional ativo, conexões em dia e pronto para o uso do profissional de saúde.
* **🔴 NÃO CONFORME:** Apresentou defeito impeditivo (tela rachada, falha de bateria, carregador danificado, etc.).
* **🟡 NÃO LOCALIZADO:** O equipamento físico não foi encontrado na unidade no momento em que o fiscal realizou a vistoria.
* **🟠 LOCALIZAÇÃO INCORRETA:** O patrimônio está em perfeito estado e operacional, porém foi encontrado fisicamente na unidade B, enquanto nos registros contratuais oficiais deveria estar alocado na unidade A.

**📸 Coleta de Evidências:** No momento do preenchimento, o sistema permite que o auditor tire fotos em tempo real e escreva diagnósticos específicos que ficam salvos na nuvem como provas técnicas de auditoria.

---

## 🛠️ 4. Ações Corretivas e Planos de Ação: O Caminho para a Resolução

O que acontece quando algo falha? Um bom sistema não apenas aponta erros, ele guia a correção. É aqui que entra o fluxo automático de **Planos de Ação**.

* Sempre que um equipamento recebe o diagnóstico de **Não Conforme (🔴)**, a plataforma gera automaticamente uma tarefa de correção no painel de *Ações Corretivas*.
* Essa tarefa descreve o que precisa ser consertado ou substituído (por exemplo: "Trocar display trincado").
* O item permanece em estado de alerta (*Pendente*) até que a equipe técnica de reparos realize o conserto físico na unidade. 
* Após o reparo, o técnico marca o plano de ação como **Resolvido**, restaurando o indicador positivo de regularidade do ativo.

---

## 🔍 5. Busca Global: Localização Instantânea de Ativos

Imagine que o gestor principal precisa responder rapidamente ao cliente: *"Onde está o tablet #1052 e quando ele foi auditado pela última vez?"*

O mecanismo de **Busca Global de Ativos** no topo da Dashboard funciona como um rastreador em tempo real:

* Ao digitar as primeiras letras ou números do patrimônio, descrição, marca ou município, o sistema filtra a base instantaneamente.
* Selecionando o ativo encontrado, abre-se uma tela que exibe o seu histórico de auditorias, fotos de vistoria, relatórios passados e se há algum plano de ação pendente ou resolvido ligado à sua etiqueta de patrimônio.

---

## 📈 6. Dashboard e BI: Central Executiva de Resultados

Para converter visitas, fotos e formulários em decisões inteligentes para a diretoria, a plataforma sintetiza todas as auditorias finalizadas em uma **Dashboard Executiva de BI (Business Intelligence)**.

A Central exibe os seguintes pilares informativos:

* **Índice Geral de Conformidade:** Exposição percentual de excelência da infraestrutura geral contra a meta contratual estabelecida de 85%.
* **UBS Não Conforme (Indicadores Críticos):** Exibe o total de unidades de saúde que apresentam padrões operacionais abaixo do nível aceitável, permitindo o direcionamento corretivo imediato da gestão.
* **Ranking de Performance por Município:** Gráfico comparativo que lista todas as cidades participantes lado a lado, facilitando a identificação de quais regiões precisam de reforço técnico ou logística preventiva.

---

## 📄 7. Declarações e Certificações: Exportação de Relatórios e PDFs

Ao final das amostragens ou ao recolher materiais de campo para assistência avançada, a plataforma gera as documentações probatórias indispensáveis:

* **PDF de Devolução e Responsabilidade:** Emite uma minuta oficial legal com a declaração de recolhimento dos equipamentos, contendo city-code, data parametrizada do sistema e linhas preparadas para assinatura direta do colaborador e do auditor responsável.
* **Tabelas para Auditorias Externas (CSV):** Exporta o compilado de dados consolidados das vistorias em planilhas tabulares prontas para análise externa e envio aos órgãos reguladores.
