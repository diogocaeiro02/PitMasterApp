# Pitmaster Copilot — Guia de utilização

## Durante a corrida

O ecrã Corrida apresenta um único **Copilot** com a próxima ação prioritária. Os detalhes ficam em «Porquê? / Cenários».

Ordem principal de atenção: piloto por confirmar após pit automático; pit em curso; ligação live sem atualização; stint no limite ou em aproximação; falta de regras ou do próximo piloto; situação normal.

Os warnings e penalizações comunicados aparecem entre os factos analisados; o Race Control mantém os seus avisos visuais/sonoros dedicados.

## Pit em 0/1/2/4 voltas

A estimativa usa o tempo de stint decorrido e o tempo representativo das voltas válidas recentes. Compara o tempo previsto de entrada com os **limites mínimos e máximos de stint** configurados. Marcar um cenário como válido não garante chegada à entrada da box dentro do limite.

- **Dentro dos limites:** existe margem prevista de pelo menos aproximadamente uma volta para o limite máximo.
- **Margem curta:** risco próximo do máximo; a aplicação não permite guardar esta janela por este atalho.
- **Cedo demais:** o stint mínimo ainda não terá sido cumprido.
- **Limite excedido:** o máximo seria ultrapassado.
- **Não validado:** regras ou tempos insuficientes.

A comparação com o ritmo do pelotão é uma extrapolação simples em segundos para as próximas voltas. **Não significa ganho/perda garantido de posições.**

Ao clicar «Guardar cenário no plano», a aplicação exige que o piloto atual esteja alinhado com o plano ativo e que exista um stint futuro onde compensar a diferença, preservando a duração global prevista. **Não regista entrada ou saída da box.** Para alterações complexas, abre Estratégia → Simular alterações.

## Dados necessários para resultados úteis

1. Identificar corretamente a prova, o kart e o piloto atual.
2. Configurar limites mínimo/máximo do stint, pits obrigatórios e tempo mínimo de paragem conforme o regulamento.
3. Configurar a ordem dos pilotos e o plano de stints (para aplicar simulações).
4. Garantir atualizações recentes do Apex ou RaceFacer; historicamente estes conectores são experimentais.
5. Ter várias voltas recentes válidas para analisar ritmo, e pits/voltas dos adversários para projeções.
6. Confirmar no dispositivo o áudio de avisos de stint, por limitações dos navegadores.

Se qualquer um destes dados faltar, o Copilot explica a limitação em vez de a preencher com um número inventado.

## Cinco testes recomendados

1. Abrir **Simular**, ir a Corrida e selecionar «Porquê? / Cenários»; verificar selo DADOS SIMULADOS e que «Guardar cenário» está desativado.
2. Sair do simulador e verificar que os dados reais anteriores não foram misturados com os fictícios.
3. Numa prova de teste, configurar pilotos/limites e iniciar stint manualmente; testar alterações de cenários sem modificar o plano até à confirmação.
4. Verificar os avisos quando faltarem aproximadamente quatro, duas e uma voltas para o limite (em corrida de teste, com áudio ativado).
5. Interromper a ligação Live Timing e confirmar que o Copilot **não** recomenda ritmo ou projeções baseados em dados antigos.

O Copilot é apoio à decisão, não substitui a cronometragem oficial, a confirmação física do pit nem o regulamento.
