# PITMASTER V0.18 – GitHub, Vercel e workflow simplificado

## Prova de 29/11/2026 – formato 10+30
1. Em **Provas**, usar **Formato 10 + 30**. Isto configura a pista KIP Palmela, data, qualificação prevista de 10 min e corrida de 30 min.
2. **Confirmar o regulamento oficial** antes de começar: pits obrigatórios, tempos de pit, limites de stint, trocas e eventuais penalizações. O atalho deixa esses valores em branco intencionalmente.
3. Adicionar pilotos e escolher o número do kart. Verificar o kart atribuído para a qualificação e para a corrida; pode mudar entre fases.
4. Ir a **Qualificação** e selecionar a fase. O valor de 10 min é uma duração planeada, não um temporizador de cronómetro independente; o cronómetro real provém do Live Timing.
5. Antes da corrida, selecionar **Corrida** no percurso de fases e testar o registo manual de pits/alterações de piloto.

## GitHub

Descompactar o arquivo num diretório novo. O diretório com `package.json` e `index.html` é a raiz do projeto. Num terminal:

```bash
npm install
npm test
npm run build
git init
git add .
git commit -m "Pitmaster V0.18 – Race workflow"
git branch -M main
git remote add origin https://github.com/SEU_UTILIZADOR/SEU_REPOSITORIO.git
git push -u origin main
```

Criar previamente um repositório vazio no GitHub e substituir o URL pelo verdadeiro. Não submeter `node_modules`, `dist` ou ficheiros `.env`.

## Vercel

Na Vercel, selecionar **Add New → Project**, importar o repositório, e verificar:

- Framework: **Vite**
- Root directory: diretório que contém o `package.json` (por defeito `/`)
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

O `vercel.json` inclui fallback SPA para atualizações do browser. Não é necessário backend para a interface nesta versão.

## Segurança operacional e limitações

- **Apex Timing:** o endpoint correto de Palmela **não foi validado neste release**. O WebSocket pode funcionar localmente mas ser recusado devido ao `Origin` de produção. A Vercel não contorna as regras do servidor remoto. Confirmar acesso na pista antes de confiar em dados ao vivo.
- **RaceFacer:** conector ainda experimental e não substitui os dados Apex da KIP Palmela.
- **Persistência:** as corridas, os pilotos e a estratégia são armazenados no `localStorage` **deste navegador e dispositivo**; GitHub e Vercel não sincronizam os dados entre Mac e telemóvel. Configurar e operar no mesmo dispositivo, evitando apagar dados do site.
- **Áudio:** os alertas exigem toque no botão de ativar som; telemóveis podem silenciá-los em segundo plano ou com o ecrã bloqueado. Não substituem um cronómetro de segurança.
- **Navegação:** se a conexão falhar, usar registos manuais e verificar dados oficiais do cronometrista. Não confiar apenas em previsões virtuais para cumprir o regulamento.
- **Offline:** não há garantia de operação offline após perder a rede, particularmente no primeiro carregamento. Manter a página aberta e um plano manual em papel ou cronómetro.
- **Publicação:** não acrescentar credenciais/tokens de cronometragem a este repositório público.

## Verificação rápida

```bash
npm install
npm test
npm run build
npm run dev
```

Visitar `http://localhost:5173`, criar prova 10+30, preencher pilotos, rever regulamento, abrir Qualificação e Corrida. Depois validar no URL de produção e no telemóvel.
