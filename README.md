# Pitmaster V0.18 — Fluxo de prova e interface limpa

Consulta `RELEASE-NOTES-V0.18.md` para novidades e limitações.

# HISTÓRICO: V0.17 — PALMELA 10+30

Para publicar no GitHub e na Vercel, ler primeiro **README-DEPLOY-VERCEL.md**.

# Pitmaster V0.16 — Configuração Guiada de Provas

Nova página **Provas** com assistente de cinco passos, resumo de configuração, regulamento essencial destacado, regras avançadas recolhíveis, formulário de pilotos e fonte Live Timing. Todos os módulos da V0.15.1 permanecem. Ver `docs/V0.16-GUIA-PROVAS.md`.

## Instalação

```bash
npm install
npm run build
npm run dev
```

---

# Pitmaster V0.15 — Race Signals / Pit Timing Precision

Esta versão sucede à V0.14 e preserva as funcionalidades existentes. O foco é **legibilidade instantânea para equipas amadoras** e **precisão dos tempos de boxes**.

## Alterações na V0.15

- **Tempo de box em `m:ss:SSS`** em todos os pontos principais: pit em curso, tempo mínimo restante, histórico de pits, gráfico de paragens, regras e previsão por stint. Exemplo: `3:01:104` corresponde a 3 minutos, 1 segundo e 104 milésimos.
- **Edição de pit prevista e mínimo regulamentar** em `m:ss:SSS`, sem arredondar para segundos inteiros. Os valores são guardados internamente em segundos numéricos (podem ter milésimos) e os eventos reais em milissegundos, mantendo a compatibilidade com dados anteriores.
- **Validação do campo**: aceita `m:ss:SSS`, `m:ss`, `m:ss.SSS` e segundos simples por compatibilidade. Impede formato incorreto e valores inferiores ao mínimo configurado por paragem.
- **Novo sistema visual cromático**: carvão/azul ardósia como base, verde para equipa e ações, ciano para timing/pits, violeta para projeção/estratégia, âmbar para avisos e vermelho para críticos. Cards principais e secundários receberam fundos e acentos próprios, melhorando a identificação num relance.
- **Desktop e mobile**: estilos dedicados para cartões, grelhas, formulários, textos numéricos e prioridades visuais. A barra fixa de stint mantém-se.
- **Novos testes**: `npm run test:pit-time` valida formatação, parsing e milésimos.

## Instalação no Mac

```bash
npm install
npm run build
npm run dev
```

Abre `http://localhost:5173` e confirma a página Estratégia → Tempos de pit, incluindo a simulação de boxes.

## Notas de validação

Os testes Node de lógica passam e os ficheiros TypeScript/TSX foram analisados sintaticamente. Neste ambiente **não foi possível instalar React/Vite devido a erro DNS `EAI_AGAIN`**, pelo que o build Vite completo deve ser validado no Mac com `npm run build`. A revisão do CSS foi feita com parser. Não foi possível concluir QA visual automatizada em Chromium neste ambiente; testa os ecrãs reais em desktop e telemóvel antes de usar em prova.

---

# PITMASTER V0.14 — Race Operations & Live Strategy

Evolução da V0.13 para **equipas amadoras de karting endurance**, preservando o dashboard, Provas, Classificação Virtual, Pace Intelligence, ORACLE, simulador e design responsivo.

## Novo nesta versão

- **Qualificação:** novo separador para treinos, qualificação e superqualificação opcional. Cada fase tem identificação de kart própria; ranking por melhor volta, gap à pole, setores e tempo de sessão. Snapshots por fase guardados localmente (últimos 250 tempos e 150 passagens), sem misturar intencionalmente o histórico da endurance. A atribuição de fases é manual enquanto o Live Timing não identificar a fase com segurança.
- **RaceFacer experimental:** leitor Socket.IO/Engine.IO v4 baseado nas mensagens `42["slug",{"type":"live-timing",...}]` capturadas em `e1gokartkielce`. Recebe classificações, equipa · kart, melhor/última volta, setores, passagens e atualização de contagem de voltas. Pacotes repetidos são deduplicados. Reconexão limitada a cinco tentativas. Especificar URL `https://live.racefacer.com/NOME-DA-PISTA` nas Provas, selecionar RaceFacer e usar **Definições → Ligar RaceFacer**. **O mecanismo de subscrição por pista não foi confirmado em todas as pistas, nem há garantia de que o WebSocket aceite ligações a partir do browser local.** Se a plataforma exigir outra subscrição ou rejeitar a origem, a ligação pode não receber eventos. Não executa scraping nem contorna autenticação.
- **Pit automático por evento observado:** em fontes que disponibilizam `in_pit` e `has_pits`, a transição confirmada de fora → dentro da box cria o registo do pit, encerra o stint anterior e abre a janela "Quem entrou?" com piloto sugerido. A transição dentro → fora inicia o próximo stint à hora da receção do evento. Se não houver confirmação, fica "Piloto por confirmar" e um aviso pendente que permite corrigir depois. Não duplica o pit quando chegam frames repetidos. Pits manuais continuam disponíveis.
- **Estratégia viva:** stints concluídos ficam bloqueados; o piloto atual está protegido e a duração futura pode mudar. **Simular alterações** cria rascunho, **Aplicar plano** confirma e **Descartar** preserva o plano ativo. Tempos previstos por pit configuráveis por stint, tempos reais apresentados num histórico e cálculo do orçamento total com stints/pits concluídos.
- **Alerta sonoro e visual de stint máximo:** em vez de cinco minutos fixos, o primeiro aviso ocorre com aproximadamente quatro voltas (mediana de até sete voltas válidas; fallback da melhor volta da equipa). Alertas adicionais a duas e uma volta e no limite máximo. Cor e som têm prioridade progressiva; aviso apenas uma vez por patamar e stint. Som precisa de interação inicial no dispositivo; usa **Definições → Ativar e testar som**.
- **Celebração de corrida:** pop-up com confetis e agradecimento à equipa apenas quando existe condição de fim da sessão **e uma NOVA passagem pela meta do nosso kart** no feed live RaceFacer, uma única vez por prova/sessão. Sem passagem ou confirmação do fim, não festeja automaticamente. A posição é apresentada como **provisória**. Compatibilidade com sinais de bandeira de xadrez/fim dos fornecedores ainda requer testes reais.
- **UX desktop/mobile:** novas janelas de confirmação de pit, qualificação com grelha fluida, cores semânticas (ciano cronometragem, violeta simulação, âmbar atenção, vermelho urgência) e alertas acima do HUD fixo. Confetis desativados quando o dispositivo pede redução de movimento.
- **Classificação virtual da V0.12 preservada:** não calcula previsão de endurance com dados de uma sessão RaceFacer `is_endurance:false` (qualificação/sprint).

## Instalação e testes no macOS

Extraia numa **pasta nova**, sem misturar com versões anteriores.

```bash
npm install
npm run build
npm run dev
```

Abra o endereço indicado pelo Vite, habitualmente `http://localhost:5173/`.

`npm test` executa testes de estratégia, ritmo, rivais, Race Control, pit, simulador, projeção, RaceFacer, transições de box, alertas, fases e celebração.

## Limitações importantes / estado beta

1. **Não foi possível instalar pacotes npm neste ambiente de criação** (rede indisponível). Os testes Node passaram, a sintaxe de todos os módulos foi verificada e houve análise estática TypeScript com declarações temporárias de módulos, mas **não foi possível executar `npm run build` integral nem testar end-to-end a aplicação com React real**. Faz o build no Mac e envia qualquer erro.
2. **RaceFacer:** a estrutura das mensagens de timing foi confirmada em capturas, mas o conector browser-a-browser **ainda não foi validado numa sessão real**. A origem, o formato de subscrição e as mensagens de endurance específicas podem variar. O protocolo público pode alterar-se.
3. **Pits:** o JSON observado não fornece timestamps de entrada/saída em box claramente verificados. A V0.14 usa a **hora local de receção do evento**, não garante o tempo oficial regulamentar. Confirma os dados antes de tomar decisões com consequências de penalização.
4. **Pits e celebração automática** só são ativados quando existem sinais fiáveis. Em Apex, ainda faltam eventos de pit e fim de corrida oficialmente mapeados. Não se assume pit/chegada pelo simples relógio ou pelo líder.
5. **Qualificação:** a mudança de fase é manual e os snapshots são por fase; não há ainda deteção automática inequívoca de sessões ou identificação regulamentar de grelha.
6. **Persiste localmente:** o registo e a estratégia estão neste navegador/dispositivo, sem sincronização multi-dispositivo. Para uma corrida real, recomenda-se um dispositivo principal e cópias exportadas dos registos.
7. Os dados do **simulador são fictícios**; classificação virtual e ORACLE são estimativas e não decisões oficiais.

## Estrutura

- `src/timing/racefacer.ts` — parser de mensagens Socket.IO e histórico de passagens
- `src/timing/connection.ts` — ligação WebSocket Apex / RaceFacer experimental
- `src/pitAutomation.ts` — detetor puro de transições de pit
- `src/QualificationPanel.tsx`, `src/racePhases.ts` — qualificação e fases
- `src/liveStrategy.ts`, `src/StrategyPanel.tsx` — orçamento com tempos reais e simulação isolada
- `src/stintAlerts.ts` — avisos de limite personalizados ao ritmo
- `src/finishCelebration.ts` — regra conservadora para celebrar uma vez após nossa passagem

---

## Histórico anterior

# PITMASTER V0.13 — Field UX, Desktop & Mobile

Evolução **visual e responsiva** da V0.12.1 para uso rápido por pilotos amadores nas boxes. Sem alterar a lógica de timing, estratégia, simulação ou armazenamento.

## O que mudou

- **Mobile-first (320 a 620 px):** cabeçalho e navegação adaptados aos toques, estado da ligação visível, grelha compacta, botões de ações principais largos e sem sobreposição horizontal.
- **Tablet (621 a 850 px):** navegação fluida e distribuição vertical dos cartões sem colunas demasiado estreitas.
- **Desktop:** alinhamentos consistentes, painéis de detalhes à direita e espaçamentos homogéneos.
- **Provas, Corrida, Estratégia, Classificação:** medidas responsivas, formulários utilizáveis no telemóvel e texto que pode quebrar linha sem sair dos cartões.
- **Cronómetro fixo do stint:** mantém-se visível e acessível; reserva de espaço no fundo do ecrã, incluindo safe areas do iPhone.
- **Janelas/painéis:** janelas do mobile abrem como sheets inferiores, limitadas à altura do ecrã; desktop mantém painéis laterais. Bloqueio da rolagem de fundo enquanto uma janela está aberta.
- **Cores semânticas:** verde (normal), ciano (ligação Live Timing), violeta (classificação projetada), âmbar (aviso) e vermelho (crítico).
- **Animações subtis:** entrada dos ecrãs e painéis, estado da ligação e avisos de stint. Todas respeitam `prefers-reduced-motion`.
- **Navegação:** abrir outro separador reposiciona a página no início, evitando aterrar a meio do conteúdo no mobile.
- **Compatibilidade macOS:** preservada a correção de nomes de ficheiros da V0.12.1.

## Testes feitos

- `npm test`: **11 suites existentes passaram** (estratégia, ritmo, rivais, alertas, pit, ORACLE, simulador, gráficos, stint, projeções e provas).
- Sintaxe TS/TSX: **26 ficheiros verificados, sem erros de parsing**.
- CSS: **sem erros de parsing**.
- Inspeção do layout CSS em Chromium com ecrãs de **320, 375, 430, 768 e 1440 px**, sem largura horizontal excedente num ecrã de teste representativo.
- **Limitação:** não foi possível concluir `npm install` no ambiente de construção. Não é possível afirmar que o projeto passou o `npm run build` completo; executa-o no Mac antes de usar numa corrida real.

## Instalação

```bash
npm install
npm run build
npm run dev
```

Descompactar numa pasta **nova**, sem misturar ficheiros com versões anteriores. O Vite indica o endereço local (tipicamente `http://localhost:5173/`).

## Funcionalidades futuras (NÃO incluídas nesta atualização visual)

- Conector RaceFacer de receção automática Socket.IO, ainda em validação.
- Fase independente de qualificação e superqualificação.
- Registo automático de pit por feed e confirmação do próximo piloto.
- Replaneamento dinâmico com bloqueio automático de stints realizados.
- Alarmes sonoros personalizados para ~4 voltas até ao máximo de stint.
- Celebração com confetis após a passagem final do nosso kart.

A V0.13 não altera o tratamento de dados nem implementa antecipadamente estas funcionalidades.

---

# Correção V0.12.1 — macOS

Esta atualização corrige um conflito de nomes que impedia o Vite de resolver o componente fixo de stint em sistemas de ficheiros macOS que não distinguem maiúsculas/minúsculas.

- `src/StintHUD.tsx` passa a `src/PersistentStintBar.tsx`.
- `src/main.tsx` importa agora o componente por `./PersistentStintBar`.
- O módulo de lógica `src/stintHud.ts` e as suas funções permanecem inalterados.
- Todas as funcionalidades da V0.12 são preservadas.

No Mac: `npm install`, depois `npm run build` e `npm run dev`. Se o servidor Vite antigo estiver aberto, termina-o com `Ctrl+C` antes de reiniciar.

---

# PITMASTER V0.12 — Race Hub + Classificação Virtual

Webapp de apoio à gestão de corridas de karting endurance. React + TypeScript + Vite.

## Novidades da V0.12

- **Provas / Race Hub** redesenhado: biblioteca com pesquisa e filtro por estado, prova selecionada, checklist de preparação, formulário uniforme, fonte de cronometragem e importação JSON em opções avançadas.
- **Duplicar uma prova**: reutiliza nomes de pilotos e regras, mas deixa vazios os turnos, pits, resultados e plano de stints; o URL da fonte também é limpo. O status da prova pode ser alterado manualmente.
- **Classificação virtual (final projetado)**: modo **Oficial / Virtual** na página Classificação, com motor de projeção que contabiliza ritmo recente, voltas completadas, pits por realizar, tempo restante e perda média estimada por pit stop.
- **Card Final Projetado** no topo do dashboard; ao clicar abre painel de detalhes, no desktop lateral e no mobile em modal.
- **Rivais na classificação virtual**: equipas vizinhas da posição projetada, identificadas por nome e número do kart, com gap projetado, ritmo e pits restantes; detalhes em painel lateral.
- **Card Tempos de Volta**: última + melhor volta juntas, diferença face à volta anterior e distância à melhor.
- **Limpeza da interface**: removido o card redundante de Classificação Completa no dashboard (o separador Classificação continua disponível), espaçamentos consolidados, cards sem dados mais compactos, melhoria de botões, campos e responsividade.
- **Race Control**: nomes das equipas nos warnings/penalizações quando conhecidos, com número do kart como referência.
- **Stint HUD fixo** em todas as páginas e funcionalidades anteriores preservadas (simulador, Pace Intelligence, Lap Performance, estratégia, pits, ORACLE, gráficos).

## Como iniciar no Mac

```bash
npm install
npm run dev
```

Abre o endereço que o Vite indicar (geralmente http://localhost:5173/).

## Como testar a classificação virtual

1. No topo, abre **Simulador**. A simulação já inicia com 12 minutos fictícios de histórico.
2. Entra em **Classificação** e escolhe **Virtual · final projetado**.
3. Por omissão, quando faltam regras, **só no simulador** são usados pressupostos de treino: 7 horas, 6 paragens mínimas e 60 segundos de perda por paragem. Todos estes pressupostos são explicitamente rotulados como simulação.
4. Experimenta uma paragem ou o cenário de ritmo lento e vê a tabela, o card do topo e os rivais virtuais evoluir.
5. Em **cronometragem real**, configura primeiro os pits obrigatórios no separador Estratégia e introduz, na Classificação Virtual, os **minutos restantes** e o **tempo médio perdido em cada pit stop**. Sem voltas e pits suficientes de **todos** os participantes, a aplicação não inventa projeções.

### Como funciona a projeção

A previsão usa, para cada kart, o número de voltas completadas, a mediana das cinco últimas voltas válidas, os pits já realizados, o mínimo ainda em falta e o tempo disponível até ao fim. Estima voltas restantes a ritmo constante após subtrair o tempo estimado das paragens obrigatórias e ordena as equipas por voltas totais projetadas. Gaps projetados são aproximações, não diferenças oficiais.

**Limitações importantes:** não contempla evolução futura do ritmo, tráfego, bandeiras, penalizações não confirmadas, alteração de kart nem estratégias reais dos adversários. Quanto maior o tempo restante, menor a confiança. Nunca utilizar como resultado oficial nem garantia de posição. A mensagem histórica de Palmela não contém os históricos completos de voltas para projetar um resultado rigoroso — o estado “Projeção indisponível” é intencional.

## Integradores de cronometragem

- **Apex Timing:** conector WebSocket experimental, dependente da permissão do servidor. É preciso um endpoint específico e autorizado da pista.
- **RaceFacer:** seleção de fornecedor e formato JSON comum; ligação live ainda **não** implementada nem validada.
- **Manual:** importação JSON normalizado.

## Testes

```bash
npm test
npm run build
```

Os testes Node dos módulos de projeção, ritmo, estratégia, stints, simulador, pit stops e alertas foram executados no ambiente de preparação. A sintaxe TypeScript/TSX e o CSS também foram analisados. O build final do Vite depende de `npm install` no teu computador; **não foi possível validar a compilação integral neste ambiente sem acesso às dependências npm**.

## Dados locais

Os dados das provas, da estratégia, dos stints e dos parâmetros da projeção são guardados no `localStorage` deste navegador. Não estão sincronizados entre dispositivos. Exporta um backup JSON antes de apagar o armazenamento do browser.

## Publicação futura

Ainda não é necessário colocar online. Quando a versão for validada localmente, poderás enviar o projeto ao GitHub e importar um projeto Vite na Vercel. A ligação persistente ao Apex fora do seu site continua a necessitar de testes e de autorização/compatibilidade do servidor.


## V0.15.1 — Estabilidade dos cronómetros
Corrigido o layout a oscilar enquanto os segundos são atualizados: largura reservada nos gaps de proximidade, algarismos tabulares, espaço mínimo em indicadores de estado e linhas de ritmo com altura estável. Sem alterações ao cálculo ou ao ritmo de atualização do Live Timing.
