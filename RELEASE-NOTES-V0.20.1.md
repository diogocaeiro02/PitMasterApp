# Pitmaster V0.20.1 — Correção de compilação

- Corrigido TS2367 em `src/main.tsx`: removida uma comparação inacessível com `mode === 'empty'` no estado sem dados do Pace Intelligence.
- O estado `empty` continua a ser tratado no painel de espera da corrida, fora deste ramo.
- Sem alterações à lógica de cronometragem, estratégia, navegação ou dados das provas.

## Verificação no Mac

```bash
npm install
npm test
npm run build
```

Depois de o build passar, faz commit e push para atualizar a Vercel.
