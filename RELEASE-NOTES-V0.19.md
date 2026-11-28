# Pitmaster V0.19 — Copilot estratégico (beta)

## O que mudou

- **Copilot operacional** substitui o antigo banner genérico «Próxima decisão» no ecrã Corrida. Apresenta uma única ação prioritária com texto e cor semânticos, sem encher o dashboard.
- **Motor de decisão explicável (`src/copilot.ts`)** combina o estado da prova, piloto atual, stint mínimo/máximo, ritmo de voltas, pits obrigatórios/restantes, tempo mínimo de pit, tempos restantes e sinais de Race Control.
- **Próximo piloto:** respeita o piloto planeado quando é elegível; se não, propõe uma alternativa com base nas participações e limites de tempo conhecidos. Não presume que o piloto está presente ou equipado.
- **Simulador de janelas de pit:** pit agora ou dentro de 1, 2 ou 4 voltas; calcula hora aproximada, stint acumulado, margem até ao máximo e validação mínima/máxima. Rejeita opções antecipadas, tardias, com margem inferior a ~1 volta e sem regulamento completo.
- **Ritmo e rivais:** usa diferenças de medianas das últimas voltas, classificação projetada e pits em falta dos rivais, se os dados forem suficientes. Distingue sempre estimativa de resultado oficial, e nunca confunde gap virtual com posição física na pista.
- **Avisos de fiabilidade:** sem Live Timing recente ou com dados insuficientes, oculta conclusões de ritmo/projeção que possam estar desatualizadas.
- **Plano sob controlo:** selecionar um cenário não altera os registos. Para guardar, exige confirmação explícita, stint real ativo alinhado com o plano, um stint seguinte editável e validação das regras. Ajusta apenas as durações do stint atual e seguinte, preservando o orçamento e todos os stints concluídos.
- **Desktop e mobile:** cartão principal compacto; informações detalhadas num painel lateral no computador e numa janela inferior no telemóvel. Áreas de toque grandes, cores consistentes e suporte a `prefers-reduced-motion`.
- **Testes:** `test-copilot.mjs` adicionado à suite `npm test`.

## Limites importantes e segurança

Este é um **Copilot determinístico e auditável, não um modelo de IA generativa nem um estratega capaz de prever o futuro**. Não altera pilotos, faz pits ou aplica estratégias sozinho. O simulador existente ORACLE continua limitado ao seu modelo de tráfego **fictício**; o Copilot não apresenta esse modelo como previsão real.

As janelas calculam **limites e diferenças de ritmo**, não simulam efeitos reais de trânsito, bandeiras, pneus, mudanças de kart ou tempo de entrada na via de boxes. O fornecedor pode reportar informação com atraso. Algumas pistas não disponibilizam dados completos de pits/stints. O cálculo da classificação virtual depende de hipóteses; não prevê a classificação oficial nem garante ganhos.

As alterações ao plano são armazenadas no navegador local. **Não existe sincronização automática entre dispositivos.** Confirma regulamento e sinais oficiais do Race Control, mantém um cronómetro de apoio e testa todos os alertas antes de utilizar numa prova.

## Validação nesta entrega

- `npm test`: passou, incluindo os novos testes do Copilot e os anteriores.
- Tipos de `copilot.ts`: `tsc --noEmit` passou.
- Análise TypeScript/TSX de 38 módulos: sem erros de sintaxe.
- Verificação estática do projeto com declarações temporárias de React e Lucide: passou; não equivale à tipagem real das bibliotecas.
- `npm run build`: **não foi possível executar**, porque `npm install` falhou com `EAI_AGAIN` ao contactar o registo npm. Executa no Mac ou no CI GitHub antes de publicar.

## Instalação / atualização GitHub e Vercel

Usar **uma pasta nova**, sem mesclar ficheiros com versões antigas. Na raiz do projeto:

```bash
npm install
npm test
npm run build
npm run dev
```

Depois de testar, faz commit para o repositório GitHub e a Vercel inicia novo deployment se estiver integrada. Consultar `README-DEPLOY-VERCEL.md`.
