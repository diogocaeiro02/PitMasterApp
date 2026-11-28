# Pitmaster V0.21 — Racing UI e Calendário

## Alterações efetuadas

1. Tipografia visual mais agressiva: **Barlow Condensed** para títulos e números de competição; **Barlow** para texto e controlos. São carregadas por Google Fonts, com fontes de fallback se não houver rede.
2. Nova paleta: azul-noite/grafite para superfícies, verde racing para ações, ciano para timing, violeta para projeções/estratégia, âmbar/vermelho para alertas.
3. Página Provas preservada como biblioteca, com cards mais compactos e sem cartão especial do formato 10+30.
4. Calendário refeito: alternar entre **Mês** e **Lista**, estatísticas resumidas, evento próximo, seleção de dia, agenda e estados por cor.
5. Preparação: foi retirada a biblioteca duplicada à esquerda e o cartão especial 10+30; a criação mantém cinco passos, e duplicar/apagar aparecem em **Gestão da prova**.
6. Estratégia: o plano é o elemento principal; os quatro indicadores aparecem apenas quando há stints. O estado vazio tem um botão **Criar primeiro stint**, mantendo **Gerar plano equilibrado** e **Simular alterações**.
7. Consistência: espaçamentos, tamanho de botões, formatos numéricos e cartões de corrida, inclusive em mobile. Lap Performance continua no topo.
8. Animações curtas de entrada e feedback, com desativação automática para preferências de movimento reduzido.
9. Preservados os módulos Copilot, qualificação, classificação virtual, pits, estratégia dinâmica, simulador e alertas.

## Testes

- `npm test`: suíte funcional existente + verificação estática do fluxo V0.21.
- Parse TypeScript/TSX de todos os módulos e análise sintática das folhas CSS.
- **Por confirmar:** `npm run build` (dependências npm inacessíveis neste ambiente) e QA visual end-to-end em browser (Chromium deste ambiente não concluiu execução).

## Antes de publicar na Vercel

1. Copiar o conteúdo do ZIP para a raiz do repositório, mantendo `.git`.
2. Executar `npm install`, `npm test`, `npm run build`.
3. Corrigir qualquer erro antes de publicar.
4. Se `node_modules` estiver rastreada pelo Git, executar `git rm -r --cached node_modules` uma única vez.
5. `git add -A && git commit -m "Pitmaster V0.21 - Racing UI" && git push origin main`.

## Segurança operacional

O Live Timing Apex/RaceFacer continua experimental, não há sincronização entre dispositivos e os avisos sonoros podem ser limitados pelo browser. Levar um cronómetro de apoio à pista.
