# Memória do projeto — Hub Âncora · Dados & Governança

> Este arquivo é a memória viva do projeto. Qualquer pessoa ou IA que abrir o repositório deve conseguir
> entender o projeto inteiro por aqui. **Atualize a seção "Estado atual" a cada etapa concluída.**

## O que é

Portal web estático e interativo que simula o ambiente de dados de uma administradora de consórcios.
É a peça de apresentação de **Lucas Pereira**, candidato à vaga de **Gestor de Dados**. O objetivo é
impressionar um diretor em 30 segundos e provar a tese: *relatório confiável depende de dado governado*.

Dor real da empresa que o Hub endereça: informação divulgada errada, rotinas que não atualizam,
rotinas que duplicam dados e tabelas sem chave primária.

## Regras do dono do projeto (não quebrar)

- Tudo em **português do Brasil**, com formatação brasileira (R$, vírgula decimal, dd/mm/aaaa).
- **Não usar logotipo nem marca oficial** da empresa. Identidade própria com as cores marinho + verde-água
  (tiradas do material de referência, para dar familiaridade) e ícone genérico de âncora.
- Verde, amarelo e vermelho são **exclusivos de status**; nunca cor de série em gráfico.
- Sem emojis na interface, sem lorem ipsum, visual de produto enterprise.
- Rodapé: "Ambiente simulado. Dados fictícios gerados para demonstração."
- Site 100% estático, sem backend. Dados em JSON gerados por Python com seed fixa.
- Dados pessoais do candidato ainda não informados ficam como `[PREENCHER]` em `app/src/content/perfil.json`
  (LinkedIn, e-mail, agenda, foto). Portfólio: https://www.lucasanalytics.com.br/
- Manter este arquivo sempre atualizado.

## Stack

React + TypeScript + Vite, Tailwind, shadcn/ui, ECharts, TanStack Table, React Flow, HashRouter.
Dados: Python 3 (numpy/pandas) em `/data-engineering`. Deploy: GitHub Pages via Actions.

## Mapa do repositório

```
CLAUDE.md                     esta memória
README.md                     apresentação do projeto, arquitetura, como rodar
app/                          front-end
  src/types/                  contratos TypeScript dos JSONs (governanca.ts, cubo.ts)
  src/content/                textos editáveis: perfil.json, artigos.json, plano90.json
  public/data/                JSONs gerados (meta, governanca/*, relatorios/*)
data-engineering/
  catalog/tabelas.py          lista mestre das 80 tabelas (status-alvo, linhagem, donos, SLA)
  catalog/cenario.py          cenário único de problemas e números-chave
  catalog/schemas.py          colunas, PK/FK e PII das 80 tabelas
  simulacao/                  simulação de negócio -> cubos dos relatórios
  governanca/                 motor de governança -> catálogo, testes, linhagem, selos, saúde
  sql/                        DDL, modelos dos marts e testes de qualidade em SQL
  tests/                      validação e reconciliação
docs/contratos.md             contratos compartilhados (rotas, tokens, arquivos, regras de coerência)
docs/roteiro-demo.md          roteiro de demo de 3 minutos
```

## Como rodar

```bash
cd data-engineering && python3 run_all.py     # regenera todos os JSONs e valida
cd app && npm install && npm run dev          # desenvolvimento
cd app && npm run build                       # build de produção em app/dist
```

## Narrativa central (o coração do Hub)

Cada problema de dado se propaga pela linhagem até um relatório, e o relatório mostra um
**selo de confiança** que aponta de volta para a tabela no Farol.

| Problema | Tabela | Efeito no negócio |
|---|---|---|
| 312 parcelas duplicadas (carga sem upsert) | `fato_parcelas` | recebimento de 16/11 ~1,8% acima do extrato |
| Rotina parada há 3 dias | `stg_telefonia_cdr` | Atendimento sem dados de voz de 14 a 16/11 |
| Respostas de pesquisa duplicadas | `fato_pesquisa_nps` | NPS de outubro levado ao comitê como 62; o correto é 56 |
| Carga parcial (412 x 1.148 linhas) | `stg_crm_propostas` | funil de 16/11 subestimado |
| 147 cotas com grupo inexistente | `dim_cota` | cotas fora das análises por grupo e safra |
| Sem chave primária | `stg_whatsapp_conversas`, `fato_chamadas_legacy` | contagens não auditáveis |
| 18% de CPF nulo no canal Parceiro | `dim_cliente` | cobrança e conformidade |

Selos esperados: Vendas = atenção · Carteira = crítico · Safra = atenção · Atendimento = crítico · Assembleias = confiável.
Farol-alvo: 47 verdes, 21 amarelas, 12 vermelhas. Índice de Saúde em torno de 71%.
Data de referência do portal: 17/11/2026 08:00.

## Decisões de arquitetura

- **Cenário único** (`cenario.py`) lido pelos dois geradores, para os números baterem entre Farol e relatórios.
- **Cubos colunares** pré-agregados por relatório; razões (ticket médio, TMA, NPS, % inadimplência) são
  calculadas no front a partir de numerador e denominador aditivos, para os filtros funcionarem.
- Filtro de UF em cubo que só tem regional usa `meta.pesos_uf` (alocação proporcional).
- Medidas de estoque (carteira) usam a última fotografia do período; nunca somam datas.
- HashRouter + `base: './'` para funcionar em GitHub Pages em qualquer subcaminho.

## Organização do trabalho (subagentes)

Orquestrador define contratos e integra. Agentes: Engenharia de Dados, Governança e Qualidade,
UI/UX e Front-end, Visualização (relatórios), QA.

## Estado atual

- [x] Contratos definidos (tabelas mestre, cenário, tipos TypeScript, tokens)
- [x] Onda 1a: simulação e cubos dos 5 relatórios (284 validações passando; `python3 data-engineering/run_all.py`)
- [x] Onda 1b: motor de governança (índice 71,5; 47/21/12; 31 pipelines; 524 testes; 10 incidentes; 28 termos)
- [x] Onda 1c: design system, shell, abertura, artigos, plano de 90 dias, filtros globais, motor de cubos, selo de confiança
- [ ] Onda 2: Home, Farol, detalhe da tabela, Rotinas, Glossário · 5 relatórios (em andamento, 5 agentes em paralelo)
- [ ] QA com screenshots
- [ ] README, roteiro de demo, workflow de deploy

## Pendências conhecidas

- Preencher `[PREENCHER]` em `app/src/content/perfil.json`.
- Publicação: habilitar GitHub Pages (Settings > Pages > Source: GitHub Actions) e levar o código para a branch padrão.

## Números reais da simulação (para conferência)

78.480 cotas ativas · saldo de R$ 10,49 bi · over 30 de 6,67% em quantidade de cotas (4,72% em saldo; over 90 de 2,79% em saldo) · 55.683 cotas vendidas em 24 meses · ticket médio de R$ 143,8 mil ·
9.499 contatos por dia útil · 409 grupos · 340 vendedores.
Cenário: 312 parcelas duplicadas em 16/11 (R$ 341.130, +1,8% sobre o recebimento correto de R$ 18,95 mi) ·
NPS de outubro 62,01 reportado x 56,06 corrigido (2.035 respostas duplicadas desde 01/10) ·
propostas de 16/11: 412 contra média de 1.148 · voz sem linhas em 14, 15 e 16/11.

## Cubos por relatório (`app/public/data/relatorios/`)

- `vendas.json`: `vendas`, `cancelamentos`, `funil`, `metas`, `extras.vendedores`
- `cobranca-carteira.json`: `carteira` (estoque, 152 fotografias), `roll_rate`, `recebimento` (com `*_dup`), `recuperacao`
- `cobranca-safra.json`: `safra_mob` (triangular; `cotas_base` repetida em cada MOB)
- `atendimento.json`: `contatos`, `motivos`, `hora`, `nps` (com `*_dup`), `csat`, `detracao` (regional/UF por pesos)
- `assembleias.json`: `contemplacoes`, `lances`, `liberacao`, `grupos`, `extras.grupos`

## Front-end: base compartilhada (ver `app/README.md` para a API completa)

- Versões: React 19, Vite 8, Tailwind 4 (tokens em `app/src/index.css`, sem `tailwind.config`), ECharts 6, react-router 7,
  zustand 5, TanStack Table 9, React Flow (`@xyflow/react`) 13. Componentes de `components/ui` no padrão shadcn (escritos à mão com Radix).
- `src/lib/cubo.ts` (filtrar, agrupar, serieTemporal, compararPeriodos), `src/lib/filtros.ts` (zustand, filtros na URL),
  `src/lib/dados.ts` (carregarJSON + hooks), `src/lib/formato.ts` (formatação brasileira), `src/lib/tema-echarts.ts`.
- `src/components/dados/` (KpiCard, ChartCard, EChart, SeloConfianca, StatusBadge), `src/components/relatorio/` (LayoutRelatorio, BarraFiltros),
  `src/components/layout/` (Shell, BuscaGlobal Ctrl+K).
- Paleta de séries validada (claro): `#175B8C #22ABA8 #6F5FD0 #58A6E8 #B4589E #C2703D`. Acima de 6 categorias, agrupar em "Outros".
- A dimensão de canal muda por cubo: `canal` (vendas, safra), `canal_cobranca`, `canal_atendimento`.

## Governança: como funciona

- `data-engineering/governanca/gerar.py` simula 30 dias de execuções e os testes de qualidade de cada tabela; o farol é calculado
  a partir deles e validado contra o status-alvo. Fórmula do índice em `saude.json` → `formula` e em `data-engineering/governanca/README.md`.
- O nível do selo parte do farol do mart do relatório e é rebaixado para "atenção" se houver upstream não-verde.
- Ids na linhagem: fontes `fonte:<slug>`, relatórios `relatorio:<id>`, tabelas pelo próprio nome.
- O motor lê `data-engineering/output/resumo_simulacao.json`; por isso rode sempre `run_all.py` (simulação antes da governança).
