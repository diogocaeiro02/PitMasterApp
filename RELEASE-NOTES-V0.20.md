# Pitmaster V0.20 — Race Hub, Calendar, Design Refresh

## Âmbito

Atualização de estrutura e legibilidade a partir da V0.19. O Copilot, alertas, estratégia, qualificação, classificação virtual, pits automáticos e simulador permanecem disponíveis.

### Navegação

- **Fora da prova:** `Provas` (biblioteca pesquisável com filtros) e `Calendário` (mês, agenda, provas sem data).
- **Dentro da prova:** `Preparar`, `Qualificação`, `Corrida`, `Classificação`, `Estratégia`; `Provas` volta ao hub.
- Uma prova existente é aberta na preparação ou diretamente na corrida se estiver marcada `Em curso`.
- O formulário de preparação já não disputa espaço com uma segunda lista de provas.
- O nome da equipa é configurável por prova, sem alterar nomes oficiais do Live Timing.

### Isolamento dos dados

- Ao abrir a aplicação, inicia-se na biblioteca, **sem carregar o arquivo 7H XMAS RACE**.
- Uma prova sem informação do seu Live Timing apresenta um estado vazio, com instruções e operações manuais de piloto/box, sem métricas fictícias.
- Uma prova real nunca importa automaticamente o arquivo Palmela ou a seleção de kart da simulação.
- O simulador permanece disponível como ambiente de teste **explicitamente identificado como fictício** e dispõe de saída.
- Ao selecionar outra prova, o Live Timing é desligado, os estados transitórios são limpos e os registos de estratégia/pilotos/pits da nova prova são recuperados do seu próprio armazenamento.
- **Nota:** se já tiveres preenchido dados incorretos no armazenamento local de uma prova antes da V0.20, a aplicação não os elimina automaticamente. Revê os regulamentos dessa prova e reinicia apenas se for essa a tua intenção.

### Apresentação

- Lap Performance como primeiro indicador da página Corrida.
- Cartões menores e estados sem dados mais compactos. Proximidade em pista deixa de ocupar um grande cartão quando não há medições.
- Paleta atualizada: lima (a nossa equipa/ação), ciano (Live Timing), violeta (classificação projetada/Lap Performance), âmbar (atenção) e vermelho (situações críticas).
- Navegação responsiva com scroll horizontal no mobile para evitar cortes/sobreposições. Calendário de 7 colunas adaptado à largura.
- Cronómetro fixo preservado durante a corrida quando há um piloto efetivamente ativo.

### Validação

- `npm test`: 22 grupos de testes, incluindo teste novo para navegação e persistência do nome de equipa.
- Parser TypeScript: sem erros de sintaxe nos módulos `.ts` e `.tsx`.
- `npm run build`: **não validado neste ambiente** por indisponibilidade da rede do npm (`EAI_AGAIN`). O build e os fluxos devem ser validados no Mac e na Vercel antes do uso numa corrida real.

### Publicação no GitHub/Vercel

1. Faz uma cópia da versão anterior e guarda/exporta os dados importantes.
2. Descompacta a V0.20 numa pasta nova (os ficheiros `package.json` e `vercel.json` devem estar na raiz do repositório, e não numa subpasta extra).
3. Executa `npm install`, `npm test` e `npm run build` no Mac.
4. Faz `git add -A && git commit -m "Pitmaster V0.20 Race Hub" && git push origin main` no repositório associado à Vercel.
5. Confirma os links e os estados no browser desktop/mobile. Os dados armazenados em `localStorage` **não sincronizam entre dispositivos** e a ligação Apex/RaceFacer continua experimental.
