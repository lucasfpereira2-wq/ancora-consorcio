# Roteiro de demo — 3 minutos

Objetivo: contar, em um caminho de cliques, a história "relatório confiável depende de dado governado".
Abra o link do Hub em tela cheia (1440×900 ou maior), modo claro.

| Tempo | Tela | Clique | O que dizer |
|---|---|---|---|
| 0:00 – 0:20 | **Abertura** | Nenhum. Deixe a tela respirar e clique em **Explorar o Hub** | "Sou o Lucas. Em vez de trazer slides, construí um ambiente simulado para mostrar como eu atacaria a dor de qualidade e governança de dados." |
| 0:20 – 0:50 | **Visão Executiva** | Aponte o **Índice de Saúde dos Dados** e a contagem do farol | "Este é o retrato de hoje: 80 tabelas monitoradas, 12 em vermelho. O índice caiu nos últimos dias, e eu sei exatamente por quê." |
| 0:50 – 1:10 | **Top 5 problemas críticos** | Clique em **Parcelas duplicadas inflando o recebimento** | "Cada problema está escrito em linguagem de negócio: não é 'job falhou', é 'o recebimento de ontem aparece 1,8% acima do extrato'." |
| 1:10 – 1:40 | **Farol › `fato_parcelas`** | Mostre o teste de unicidade com a evidência, o gráfico de volume e a amostra com as linhas duplicadas destacadas | "312 registros duplicados em `id_parcela`. A rotina reprocessou o lote sem upsert. O teste que detectaria isso leva uma linha de SQL." |
| 1:40 – 2:00 | **Linhagem** (mesma tela) | Aba **Linhagem**; siga o caminho até o relatório e clique no nó **Cobrança: Carteira e Inadimplência** | "A linhagem mostra até onde o erro viaja: da tabela para o mart e do mart para o relatório que a diretoria lê." |
| 2:00 – 2:30 | **Relatório de Cobrança** | Mostre o **selo de confiança** no topo; alterne **Reportado × Corrigido** | "O próprio relatório avisa que o número não é confiável e aponta a causa. Quem consome o dado decide com transparência." |
| 2:30 – 2:45 | **Relatório de Atendimento** (opcional) | Mostre o selo crítico e o NPS reportado × corrigido | "O NPS levado ao comitê foi 62. O correto era 56. Seis pontos de diferença por respostas duplicadas." |
| 2:45 – 3:00 | **Plano de 90 dias** | Mostre a timeline e a projeção do índice | "Em 90 dias: inventário, donos e SLAs, chaves primárias, testes automatizados e monitoramento. O índice sai de 71% para acima de 90%." |

## Frase de fechamento

"O que eu trouxe não é um dashboard bonito. É a forma como eu trabalho: todo número divulgado tem dono, tem teste e tem selo."

## Plano B (se sobrar tempo ou houver perguntas)

- **Farol › Heatmap**: 80 tabelas × 30 dias; a faixa vermelha de `stg_telefonia_cdr` mostra a rotina parada há 3 dias.
- **Rotinas**: taxa de sucesso e falhas recorrentes por pipeline.
- **Safra, MOB e Cohort**: mostra domínio do negócio de crédito e consórcio.
- **Glossário**: definição oficial de cada métrica, com tabela-fonte.
- **Ctrl+K**: busca global por tabela, relatório ou termo.
