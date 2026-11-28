# Pitmaster V0.21 — GitHub e Vercel

Repositório existente: `diogocaeiro02/PitMasterApp`. Projeto Vercel: `pitmaster-app.vercel.app`, conforme a configuração anterior. Não é necessário criar outro repositório.

## 1. Atualizar o repositório

Faz backup da pasta atual. Extrai o novo ZIP, coloca **os ficheiros da raiz do projeto** (contendo `package.json`, `src/`, `public/`, etc.) na raiz do repositório, **sem criar uma subpasta** e sem apagar `.git`.

```bash
npm install
npm test
npm run build
```

**Só continuar se o build passar.**

A captura anterior do GitHub mostrava `node_modules/` rastreada. Se ainda estiver no Git, retira-a do índice sem apagar os ficheiros locais:

```bash
git rm -r --cached node_modules
```

Se este comando disser que o caminho não corresponde a ficheiros rastreados, não há nada a remover. `.gitignore` já impede novas adições. Executar então:

```bash
git add -A
git commit -m "Pitmaster V0.21 - Racing UI"
git push origin main
```

## 2. Definições Vercel

- Framework: **Vite**
- Build Command: **npm run build**
- Output Directory: **dist**
- Root Directory: **./** (desde que `package.json` esteja na raiz)
- Deploy via branch: **main**

Se o deployment falhar, abrir o detalhe do build na Vercel e copiar o primeiro erro real.

## 3. Cuidados operacionais

- Apex e RaceFacer são integrações experimentais; confirmar ligação na pista.
- Cada navegador guarda os seus próprios pilotos, provas e estratégia em `localStorage`; os dispositivos não sincronizam.
- Alertas sonoros exigem ativação e não são garantia com o ecrã bloqueado.
- Utilizar cronómetro/folha de prova como alternativa em caso de falha.
- O simulador apresenta dados fictícios isolados de provas reais.
- Não publicar tokens, cookies ou credenciais de cronometragem.
