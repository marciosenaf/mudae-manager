<?php ?><!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mudae Manager</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <header class="panel hero">
      <div>
        <h1>Mudae Manager</h1>
        <p>Gerenciador local para XAMPP com banco JSON, backups, importação de dumps, comparação de duplicados e múltiplos haréns.</p>
      </div>
      <div class="hero-actions">
        <button id="saveBtn" class="primary">Salvar no servidor</button>
        <button id="backupBtn">Criar backup</button>
        <button id="reloadBtn">Recarregar JSON</button>
      </div>
    </header>

    <section class="panel">
      <div class="row wrap align-center">
        <select id="haremSelect"></select>
        <input id="newHaremName" type="text" placeholder="Nome do dono / harém">
        <button id="addHaremBtn" class="primary">Novo harém</button>
        <button id="renameHaremBtn">Renomear atual</button>
      </div>
      <div id="currentHaremInfo" class="muted small"></div>
    </section>

    <section class="grid two">
      <div class="panel">
        <h2>Importar dump</h2>
        <textarea id="importInput" rows="14" placeholder="Cole aqui $mmarks, $mmarksi, $ims, $im, blocos mistos..."></textarea>
        <div class="row wrap">
          <button id="importMergeBtn" class="primary">Analisar e mesclar</button>
          <button id="importReplaceBtn">Analisar e substituir harém atual</button>
          <button id="clearImportBtn">Limpar texto</button>
        </div>
        <div id="importSummary" class="muted small"></div>
      </div>

      <div class="panel">
        <h2>Comandos gerados</h2>
        <textarea id="commandOutput" rows="14" placeholder="Os comandos aparecem aqui"></textarea>
        <div class="row wrap">
          <button id="genSortBtn" class="primary">Gerar $sm com ordem atual</button>
          <button id="genDivorceBtn">Gerar $divorce dos marcados</button>
          <button id="genDivorceAllButBtn">Gerar $divorceallbut</button>
        </div>
        <div class="row wrap">
          <button id="removeDivorcedBtn">Remover marcados do banco</button>
          <button id="trashDivorcedBtn">Mover marcados pra lixeira</button>
          <button id="emptyTrashBtn">Esvaziar lixeira</button>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="row space-between align-center">
        <h2>Duplicados encontrados na importação</h2>
        <div id="duplicatesSummary" class="muted small"></div>
      </div>
      <div class="row wrap">
        <button id="applyNewBtn" class="primary">Importar só os novos</button>
        <button id="applyAllDupBtn">Atualizar todos os repetidos</button>
        <button id="applyEverythingBtn">Importar novos + atualizar repetidos</button>
      </div>
      <div id="duplicatesList" class="issues"></div>
    </section>

    <section class="grid four stats">
      <div class="panel stat"><span>Total</span><strong id="statTotal">0</strong></div>
      <div class="panel stat"><span>Kakera total</span><strong id="statKakera">0</strong></div>
      <div class="panel stat"><span>Marcados p/ divórcio</span><strong id="statDivorce">0</strong></div>
      <div class="panel stat"><span>Na lixeira</span><strong id="statTrash">0</strong></div>
    </section>

    <section class="grid three">
      <div class="panel">
        <h2>Listas</h2>
        <div class="tabs">
          <button class="tab active" data-list="wishlist">Wishlist</button>
          <button class="tab" data-list="likelist">Likelist</button>
          <button class="tab" data-list="whitelist">Whitelist</button>
          <button class="tab" data-list="blacklist">Blacklist</button>
        </div>
        <textarea id="listInput" rows="10" placeholder="Cole nomes, um por linha, ou texto copiado do comando"></textarea>
        <div class="row wrap">
          <button id="importListBtn" class="primary">Importar nomes</button>
          <button id="clearListBtn">Limpar campo</button>
        </div>
        <div id="listPreview" class="list-preview"></div>
      </div>

      <div class="panel">
        <h2>Filtros</h2>
        <input id="searchInput" type="text" placeholder="Pesquisar por nome, série, nota, rank, lista...">
        <select id="seriesFilter"><option value="">Todas as séries</option></select>
        <select id="statusFilter">
          <option value="">Todos</option>
          <option value="divorce">Marcados pra divórcio</option>
          <option value="wishlist">Na wishlist</option>
          <option value="likelist">Na likelist</option>
          <option value="whitelist">Na whitelist</option>
          <option value="blacklist">Na blacklist</option>
        </select>
        <select id="sortFilter">
          <option value="position">Posição</option>
          <option value="name">Nome</option>
          <option value="series">Série</option>
          <option value="rank">Rank claim</option>
          <option value="likeRank">Rank like</option>
          <option value="kakera">Kakera</option>
        </select>
        <div class="row wrap">
          <button id="selectFilteredBtn">Selecionar filtrados</button>
          <button id="clearSelectionBtn">Limpar seleção</button>
          <button id="markDivorceBtn">Marcar divórcio</button>
          <button id="unmarkDivorceBtn">Desmarcar divórcio</button>
        </div>
      </div>

      <div class="panel">
        <h2>Backups</h2>
        <div class="row wrap"><button id="refreshBackupsBtn">Atualizar lista</button></div>
        <div id="backupsList" class="backup-list"></div>
      </div>
    </section>

    <section class="panel">
      <div class="row space-between align-center">
        <h2>Personagens</h2>
        <div class="muted small">Arraste as linhas pela alça ⋮⋮ quando a ordenação estiver em Posição.</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th></th><th>Drag</th><th>Pos</th><th>Preview</th><th>Nome</th><th>Série</th><th>Claim</th><th>Like</th><th>Kakera</th><th>Listas</th><th>Divórcio</th><th>Ações</th>
            </tr>
          </thead>
          <tbody id="charactersBody"></tbody>
        </table>
      </div>
    </section>

    <section class="grid two">
      <div class="panel">
        <h2>Erros e avisos</h2>
        <div id="issuesList" class="issues"></div>
      </div>
      <div class="panel">
        <h2>Lixeira</h2>
        <div id="trashList" class="trash-list"></div>
      </div>
    </section>
  </div>

  <div id="modalOverlay" class="modal-overlay hidden">
    <div class="modal">
      <div class="row space-between align-center"><h3 id="modalTitle">Editar personagem</h3><button id="closeModalBtn">Fechar</button></div>
      <div class="grid two modal-grid">
        <div>
          <label>Nome</label><input id="editName" type="text">
          <label>Série</label><input id="editSeries" type="text">
          <label>Rank claim</label><input id="editRank" type="number">
          <label>Rank like</label><input id="editLikeRank" type="number">
          <label>Kakera</label><input id="editKakera" type="number">
          <label>Posição</label><input id="editPosition" type="number">
          <label>Owner</label><input id="editOwner" type="text">
          <label>Nota</label><textarea id="editNote" rows="4"></textarea>
        </div>
        <div>
          <label>Imagem URL</label><input id="editImageUrl" type="text">
          <div class="preview-box"><img id="editPreview" alt=""></div>
          <label>Atualização individual</label>
          <textarea id="editImportText" rows="10" placeholder="Cole aqui a resposta de $im Nome ou $ims Nome"></textarea>
          <div class="row wrap"><button id="applySingleImportBtn">Aplicar texto ao personagem</button><button id="clearSingleImportBtn">Limpar texto</button></div>
          <div class="row wrap checkbox-row">
            <label><input id="editWishlist" type="checkbox"> Wishlist</label>
            <label><input id="editLikelist" type="checkbox"> Likelist</label>
            <label><input id="editWhitelist" type="checkbox"> Whitelist</label>
            <label><input id="editBlacklist" type="checkbox"> Blacklist</label>
            <label><input id="editDivorce" type="checkbox"> Divórcio</label>
          </div>
        </div>
      </div>
      <div class="row wrap"><button id="saveCharacterBtn" class="primary">Salvar personagem</button><button id="trashCharacterBtn">Mover pra lixeira</button><button id="deleteCharacterBtn" class="danger">Remover do banco</button></div>
    </div>
  </div>


  <div id="compareOverlay" class="modal-overlay hidden">
    <div class="modal compare-modal">
      <div class="row space-between align-center">
        <div>
          <h3 id="compareTitle">Comparar duplicado</h3>
          <div id="compareProgress" class="small muted"></div>
        </div>
        <button id="closeCompareBtn">Fechar</button>
      </div>
      <div id="compareDiffSummary" class="card small"></div>
      <div class="compare-grid">
        <div class="panel compare-panel">
          <h4>Banco</h4>
          <div class="compare-preview"><img id="compareExistingImage" alt="" /></div>
          <div id="compareExistingFields"></div>
        </div>
        <div class="panel compare-panel">
          <h4>Novo</h4>
          <div class="compare-preview"><img id="compareIncomingImage" alt="" /></div>
          <div id="compareIncomingFields"></div>
        </div>
      </div>
      <div class="row wrap">
        <button id="keepExistingBtn">Manter do banco</button>
        <button id="updateExistingBtn" class="primary">Atualizar com o novo</button>
        <button id="applyNewOnlyBtn">Importar só os novos</button>
        <button id="cancelCompareBtn" class="danger">Fechar</button>
      </div>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>
