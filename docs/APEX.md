# Integração Apex Live Timing — notas de investigação

Estado: **parser funcional sobre as mensagens capturadas**, mas ligação a eventos reais sujeita à origem/autorização do Apex e à configuração de cada pista. **Não é uma API documentada nem um conector oficialmente suportado**.

## Endpoint

Amostra observada pelo utilizador em Karting Campillos:

```text
wss://live-data.apex-timing.com:9373/
```

Este endpoint/porta **não é universal**. Para Palmela foi observado `configPort = 10110` num ficheiro `config.js`, mas o endereço seguro completo não foi validado nesta conversa. Não converter automaticamente `configPort` em porta WebSocket de outros circuitos.

## Inicialização

O primeiro quadro pode conter várias linhas separadas por `\n`:

```text
init|p|
track||Karting Campillos
title2||Sesión 17
grid||<tbody><tr class="head">...</tr>...</tbody>
com||<p>...</p>
```

O HTML é interpretado por `DOMParser` num documento isolado; **não é injetado diretamente no ecrã**. As colunas dependem do cabeçalho `data-type` e mudam de pista para pista. Ex.: `llp` última volta, `blp` melhor volta, `tlp` voltas, `s1/s2/s3` setores, `gap` e `int` diferenças oficiais.

## Mensagens incrementais

Exemplo observado do kart associado à linha `r2`:

```text
r2c2|sr|
r2c8|tb|19.685
r2c9|tb|1:19.061
r2c10|ib|1:19.061
r2c13|in|3
r2|*|79061|26065
```

- `rNcM|classe|valor` atualiza uma célula (coluna M da linha N).
- `rN|#|POS` pode atualizar a classificação.
- `rN|*|...` aparece com uma passagem na meta; o número interno do evento **nem sempre** coincide com o tempo da coluna `llp` (exemplos reais incluem `1:40.408` junto de `*|93912`). Por isso a volta usa sempre `llp`.
- `rN|*i1|...` e `rN|*i2|...` parecem referir passagens intermédias. Estão marcados S1 e S2, mas o seu significado deve ser confirmado em cada instalação.
- `dyn1|count|...` atualiza um contador da sessão; a sua unidade/semântica não estão confirmadas.
- `com||...` contém mensagens textuais de Race Control; podem incluir avisos, penalizações e correções.

## Limitações dos cálculos de proximidade

Os timestamps são do **recebimento no navegador**, não timestamps oficiais de passagem. Não se deve converter a diferença entre timestamps em posição física absoluta sem controlar número de volta, ordem, latência, perdas do feed, mudanças de kart e dobragens. O dashboard apresenta estimativas e omite-as quando não há dados comparáveis.

## Ritmo relativo e ranking de volta

O Pitmaster utiliza as **últimas cinco voltas captadas** por kart dentro de limites básicos (40–240 segundos). A mediana de cada kart serve para criar a referência do pelotão. Para determinar se a evolução do ritmo é positiva, compara a mudança da nossa mediana com a mudança da mediana dos rivais entre duas janelas. O resultado indica tendência, **não demonstra a causa**.

A projeção de volta em curso depende da passagem por S1/S2 e da mediana dos setores restantes da nossa equipa. É uma aproximação; condições e tráfego podem alterar substancialmente o resultado. O ranking é relativo aos karts com dados disponíveis, não necessariamente a todos os participantes inscritos.

## Antes de uma corrida competitiva

1. Confirmar autorização do circuito e origem WebSocket.
2. Validar endpoints, colunas e cronologia numa sessão ativa de vários karts.
3. Testar faltas de mensagens, interrupções de rede, mudanças de sessão, pit stops, dobragens e pilotos partilhando kart.
4. Implementar armazenamento durável e sincronização se houver vários dispositivos.
5. Não usar as estimativas como base única de uma decisão com penalização regulamentar.
