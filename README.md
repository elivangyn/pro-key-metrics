Logística & Supply Chain Analytics (AI-Augmented)

📌 Visão Geral do Projeto

Este repositório contém o modelo analítico e a arquitetura de dados desenvolvidos para monitoramento e otimização de operações logísticas. A solução consolida indicadores estratégicos de desempenho (KPIs) para suprir a alta gestão com diagnósticos precisos sobre eficiência operacional, custos de frete e nível de serviço ao cliente.

🛠️ Arquitetura & Desenvolvimento Híbrido

O desenvolvimento deste painel seguiu uma abordagem focada no domínio da regra de negócio:

Domínio de Negócio e Arquitetura (Humano): Mapeamento do fluxo logístico, estruturação do modelo de dados (fatos/dimensões), definição das métricas operacionais e validação dos contextos de filtro.

Suporte de IA (Aceleração): Utilização pontual de Inteligência Artificial para apoio no rascunho de estruturas relacionais e sugestões de otimização de sintaxe DAX/M.

🔒 Governança: A precisão das fórmulas, a consistência dos relatórios e a lógica de negócio foram totalmente desenvolvidas e auditadas sob responsabilidade técnica do especialista humano.

🎯 Insights Executivos & Tomada de Decisão

A partir dos dados consolidados nesta solução, a liderança executiva obtém visibilidade imediata para:

Eficiência no Nível de Serviço (On-Time / In-Full): Identificação de gargalos na cadeia de entregas, permitindo atuar pontualmente em transportadoras ou rotas com desvios de SLA.

Gestão de Custos & Frete Médio: Acompanhamento do custo por tonelada/volume transportado, viabilizando renegociações estratégicas de contratos de frete.

Otimização de Lead Time: Análise do tempo de ciclo — do processamento do pedido à entrega final —, reduzindo o tempo de permanência de mercadorias em trânsito.

Ocupação de Frota & Capilaridade: Monitoramento da capacidade volumétrica utilizada, minimizando fretes ociosos e otimizando a malha de distribuição.

⚙️ Modelagem & Engenharia de Métricas (DAX)

Abaixo estão os padrões técnicos de DAX aplicados na construção dos KPIs de logística:

1. Nível de Serviço & SLA

OTD (On-Time Delivery):

% On-Time Delivery = 
DIVIDE(
    CALCULATE(COUNTROWS(fEntregas), fEntregas[StatusPrazo] = "No Prazo"),
    COUNTROWS(fEntregas),
    0
)


OTIF (On-Time In-Full): Cálculo combinado de pontualidade e integridade do pedido para avaliação de qualidade do serviço prestado.

2. Análise Temporal & Comparativos de Desempenho

Lead Time Médio por Período:

Lead Time Medio = 
AVERAGEX(
    KEEPFILTERS(fEntregas),
    DATEDIFF(fEntregas[DataPedido], fEntregas[DataEntrega], DAY)
)


Comparativo Mensal (MoM / YoY): Aplicação de SAMEPERIODLASTYEAR e DATEADD para mensurar sazonalidade do volume de expedição.

3. Custos e Métricas Financeiras Operacionais

Custo Médio de Frete por Rota/Transportadora: Utilização de SUMX e CALCULATE com ALLEXCEPT para isolar custos e comparar performance entre operadores logísticos.

Autor: Elivã M Macedo
elivann.macedo@gmail.com
```
