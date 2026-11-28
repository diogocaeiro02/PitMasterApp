# Lista rápida de validação UI — V0.13

## Equipamentos / larguras
- Telemóvel pequeno 320–360 px
- iPhone normal 375–430 px
- Tablet 768–850 px
- Portátil 1024–1280 px
- Desktop 1440+ px

## Percurso
1. Abrir **Provas**. Confirmar acesso a criar, selecionar, editar, duplicar e importar.
2. Abrir **Corrida**, rolar até ao fundo e confirmar que o HUD nunca tapa o botão final (existe margem para continuar a rolar).
3. Mudar entre **Corrida**, **Classificação** e **Estratégia** com o telemóvel em modo retrato. Confirmar que o início de cada secção aparece no topo e que não existe scroll horizontal.
4. Abrir os detalhes da **Projeção**, **Rivais**, **Pace** e **Stints**. Em desktop surge drawer à direita; em mobile, uma sheet que pode ser fechada sem perder os dados.
5. Introduzir texto longo no nome de uma prova, na equipa e nos campos de notas. Confirmar quebra de linha.
6. Alterar orientação para paisagem, abrir o teclado virtual e verificar que os botões de confirmação continuam acessíveis.
7. Simular um warning e uma penalização e confirmar que o aviso aparece acima do HUD, com som apenas se autorizado.
8. Ativar **Reduzir Movimento** nas definições do sistema. Confirmar que as animações decorativas desaparecem.
9. Testar funcionamento com ligação offline e com o simulador (estado visual diferente de uma corrida real).

**Importante:** a inspeção automatizada feita durante o desenvolvimento cobre um layout de teste representativo, não todos os ecrãs de todas as provas. Validar o build e o toque real no dispositivo antes de usar em pista.
