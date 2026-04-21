Mudae Manager para XAMPP

INSTALAÇÃO
1. Extraia esta pasta em C:\xampp\htdocs\mudae-manager-xampp-full
2. Inicie o Apache no XAMPP.
3. Abra http://localhost/mudae-manager-xampp-full/

ARQUIVOS PRINCIPAIS
- index.php: interface principal
- app.js: lógica do gerenciador
- styles.css: estilos
- api.php: leitura, gravação e backups do banco JSON
- image_proxy.php: preview local de imagens do Mudae
- data/mudae-db.json: banco atual
- data/backups/: backups automáticos e manuais

FLUXO INICIAL
1. Crie um novo harém no topo usando o nome do dono.
2. Selecione o harém correto no seletor.
3. Cole o texto do Mudae em “Importar dump”.
4. Clique em “Analisar e mesclar”.
5. Se houver personagens novos, eles entram no final do harém.
6. Se houver duplicados, compare e decida antes de atualizar.
7. Clique em “Salvar no servidor” para gravar no JSON principal.

IMPORTAÇÃO DE DUMP
O sistema aceita mistura de comandos como:
- $mmarks
- $mmarksi
- $ims Nome
- $im Nome
- listas de imagens numeradas
- blocos mistos copiados de DM ou canal

DUPLICADOS E COMPARAÇÃO
Quando um personagem já existe no banco do harém selecionado:
- ele entra na lista de duplicados
- o popup de comparação mostra Banco x Novo lado a lado
- todos os campos ficam visíveis
- a imagem aparece nos dois lados
- você escolhe “Manter do banco” ou “Atualizar com o novo”

REGRAS DE POSIÇÃO
- personagem repetido mantém a posição original do banco
- personagem novo vai para o final

EDIÇÃO INDIVIDUAL
No modal do personagem você pode:
- editar nome, série, rank claim, rank like, kakera, posição, owner, nota e URL da imagem
- aplicar um texto novo copiado de $im ou $ims
- marcar listas: wishlist, likelist, whitelist, blacklist
- marcar para divórcio
- mover para lixeira
- remover do banco

LISTAS
O sistema mantém por harém:
- wishlist
- likelist
- whitelist
- blacklist

Você pode importar nomes em massa para a lista ativa colando um nome por linha ou uma lista copiada do Mudae.

LIXEIRA
- “Mover pra lixeira” tira do harém sem apagar definitivamente
- a lixeira permite restaurar ou excluir de vez
- “Esvaziar lixeira” limpa tudo do harém atual

GERAÇÃO DE COMANDOS
O sistema gera:
- $sm com a ordem atual
- $divorce dos marcados
- $divorceallbut para manter só quem não está marcado

Quando o comando fica grande, ele é quebrado em blocos menores automaticamente.

BACKUPS
- “Criar backup” salva uma cópia do banco em data/backups/
- “Restaurar” substitui o banco atual pelo backup escolhido

COMPARTILHAMENTO DE HARÉM
Agora você pode compartilhar haréns com amigos:

EXPORTAR
1. Selecione o harém desejado.
2. Clique em “Exportar harém atual”.
3. O sistema baixa um arquivo JSON contendo apenas aquele harém.
4. Envie esse arquivo para outra pessoa.

IMPORTAR
1. Clique em “Importar harém compartilhado”.
2. Escolha um JSON exportado por este sistema.
3. O sistema cria um novo harém com os dados importados.
4. Se já existir um harém com o mesmo nome, o novo importado recebe um nome ajustado automaticamente.

FORMAS ACEITAS DE JSON COMPARTILHADO
- arquivo exportado por “Exportar harém atual”
- JSON de um único harém com campo characters
- JSON completo contendo harems[]

MODO AVANÇADO
Sugestão de fluxo para manter seus dados organizados:
1. Separe um harém por dono.
2. Sempre importe no harém certo.
3. Use a comparação de duplicados para decidir quando atualizar kakera, rank, owner e imagem.
4. Salve no servidor após lotes importantes.
5. Gere backups antes de mudanças grandes.
6. Exporte o harém atual para compartilhar com amigos.

OBSERVAÇÕES
- se o servidor local falhar ao salvar, o sistema tenta manter um fallback em localStorage
- para compartilhar dados entre computadores, use o exportador de harém ou envie o banco JSON inteiro
