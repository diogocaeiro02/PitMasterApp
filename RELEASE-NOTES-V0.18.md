# Pitmaster V0.18 — Fluxo de corrida sem ruído

## O que mudou

- Navegação operacional na ordem Provas → Qualificação → Corrida → Classificação → Estratégia. Entrar no separador Qualificação já não altera a fase da prova implicitamente.
- Corrida: três métricas principais (posição, tempos de volta e projeção). Próxima decisão, proximidade em pista, piloto atual, rivais virtuais e pits mantêm-se acessíveis no primeiro nível.
- Análises detalhadas (Lap Performance, Pace Intelligence, ORACLE e Race Control completo) ficam recolhidas numa secção expansível, sem eliminar funcionalidades.
- Estratégia: plano atual em destaque; regras e lista de pilotos num grupo expansível. Stints já realizados continuam bloqueados.
- Qualificação: dados essenciais e tabela prioritários; configuração completa da fase recolhida.
- Classificação: tabela prioritária; hipóteses da projeção recolhidas.
- Simulador: botões visíveis «Sair do simulador» na barra superior e no painel; ao sair restaura o estado prévio para arquivo/importação, ou regressa a estado sem feed se tiver interrompido um Live Timing (reconexão manual obrigatória). Não deixa dados simulados na prova real. Cenários de teste recolhidos.
- Nova folha de estilos workflow.css para evitar alterações destrutivas às regras existentes.

## Métricas que já existiam e as limitações

- **Pace Intelligence**: mediana recente da equipa vs pelotão; depende de voltas válidas reais.
- **Lap Performance**: ranking da volta concluída/projetada, baseado no histórico recebido; não é uma previsão garantida.
- **Rivais virtuais e classificação final projetada**: modelos condicionais ao número de paragens, ritmo e hipóteses; não previsão oficial.
- **Proximidade em pista**: estima ordem entre passagens de sector/meta; não é GPS ou tracking contínuo.
- **ORACLE**: heurística de janelas «pit agora vs +2 voltas», *apenas no simulador*; não recomendações validadas em corrida real.
- **Pit automático, RaceFacer, alertas, celebração**: base experimental, dependem do Live Timing e do regulamento; devem ser testados antes de uso competitivo.
- **Copilot estratégico** (análise autónoma recomendando decisões fundamentadas com os dados reais): **não está implementado**; a barra «Próxima decisão» é orientada por regras simples.

## Antes de publicar na Vercel

Instalar dependências e executar `npm test` e `npm run build`. A instalação foi bloqueada neste ambiente pela ausência de pacotes npm na cache; a compilação integral tem de ser validada no computador do utilizador ou no workflow de CI.

## Dados

São persistidos no armazenamento local de cada navegador, sem sincronização automática entre dispositivos. Não utilizar dados fictícios ou reconstruídos como dados oficiais de corrida.
