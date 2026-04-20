
const state = {
  db: null,
  filtered: [],
  selected: new Set(),
  issues: [],
  activeList: 'wishlist',
  dragId: null,
  modalId: null,
};

const STORAGE_FALLBACK_KEY = 'mudae-manager-fallback';

const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => Array.from(document.querySelectorAll(sel));

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

function normalizeNumber(value) {
  if (value === null || value === undefined) return 0;
  return Number(String(value).replace(/\./g, '').replace(/,/g, '').replace(/[^\d-]/g, '').trim()) || 0;
}

function normalizeTotalValue(value) {
  if (value === null || value === undefined) return null;
  const normalized = Number(String(value).replace(/\./g, '').replace(/,/g, '.'));
  return Number.isFinite(normalized) ? normalized : null;
}

function createEmptyDb() {
  return {
    meta: { updatedAt: '', version: 1 },
    characters: [],
    trash: [],
    lists: { wishlist: [], likelist: [], whitelist: [], blacklist: [] },
  };
}

function sanitizeLines(raw) {
  const ignored = [
    /^imagem$/i,
    /^page\s+\d+\s*\/\s*\d+$/i,
    /^mudae$/i,
    /^app$/i,
    /^#\d{4}$/,
    /^-----$/,
    /^=> /,
    /^\/\/\/+/,
    /^Você /i,
    /^A próxima/i,
    /^Próximo/i,
    /^Power:/i,
    /^Cada botão/i,
    /^Seus Personagens/i,
    /^Stock:/i,
    /^Estoque:/i,
    /^O próximo \$dk/i,
    /^\.saikai, /i,
  ];
  return String(raw || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\u200b/g, '').trim())
    .filter(Boolean)
    .filter((line) => !ignored.some((pattern) => pattern.test(line)));
}

function extractUrls(raw) {
  return String(raw || '').match(/https?:\/\/\S+/g) || [];
}

function ensureLists() {
  if (!state.db.lists) state.db.lists = { wishlist: [], likelist: [], whitelist: [], blacklist: [] };
  ['wishlist','likelist','whitelist','blacklist'].forEach((key) => {
    if (!Array.isArray(state.db.lists[key])) state.db.lists[key] = [];
  });
}

function isInList(listName, name) {
  ensureLists();
  return state.db.lists[listName].some((item) => item.toLowerCase() === String(name).toLowerCase());
}

function setInList(listName, name, enabled) {
  ensureLists();
  const lower = String(name).toLowerCase();
  const arr = state.db.lists[listName].filter((item) => item.toLowerCase() !== lower);
  if (enabled) arr.push(name);
  arr.sort((a,b) => a.localeCompare(b,'pt-BR'));
  state.db.lists[listName] = arr;
}

function listTagsForCharacter(character) {
  return ['wishlist','likelist','whitelist','blacklist'].filter((listName) => isInList(listName, character.name));
}

function makeIssue(kind, message, line = '') {
  return { id: uid(), kind, message, line };
}

function splitMixedBlocks(raw) {
  const text = String(raw || '').replace(/\r/g, '');
  return text.split(/\n(?=(?:【?.+?】?\s*-\s*\d+\s*\/\s*\d+|[^\n]+\n[^\n]+(?:\s+:[a-z_]+:)*\n(?:Animanga|Game) roulette|[0-9]+\.\s+https?:\/\/))/i);
}

function parseSingleCharacterBlock(block) {
  const lines = sanitizeLines(block);
  if (!lines.length) return null;

  const name = lines[0] || '';
  const seriesLine = lines.find((line, index) =>
    index > 0 &&
    !/^Animanga roulette/i.test(line) &&
    !/^Game roulette/i.test(line) &&
    !/^Rank de claim:/i.test(line) &&
    !/^Rank de like:/i.test(line) &&
    !/^Pertence a /i.test(line) &&
    !/^\d+\.\s+https?:\/\//i.test(line) &&
    !/^https?:\/\//i.test(line) &&
    !/\(\+\d+\)/.test(line)
  );
  const series = seriesLine ? seriesLine.replace(/:[^\s]+:/g, '').trim() : '';
  const kakeraLine = lines.find((line) => /:kakera:/i.test(line));
  const claimRankLine = lines.find((line) => /^Rank de claim:/i.test(line));
  const likeRankLine = lines.find((line) => /^Rank de like:/i.test(line));
  const ownerLine = lines.find((line) => /^Pertence a /i.test(line));
  const titleLine = lines.find((line) => /\(\+\d+\)/.test(line));
  const urls = extractUrls(block);
  const numberedImageMap = {};
  String(block || '').split(/\n/).forEach((line) => {
    const m = line.trim().match(/^(\d+)\.\s+(https?:\/\/\S+)/);
    if (m) numberedImageMap[m[1]] = m[2];
  });
  const imageUrl = urls[0] || '';
  const kakeraMatch = kakeraLine?.match(/·\s*([\d.]+):kakera:/i) || kakeraLine?.match(/^([\d.]+):kakera:/i);
  const claimRankMatch = claimRankLine?.match(/#([\d.]+)/i);
  const likeRankMatch = likeRankLine?.match(/#([\d.]+)/i);
  const ownerMatch = ownerLine?.match(/^Pertence a\s+(.+?)\s*~~\s*(\d+)\s*\/\s*(\d+)/i);

  if (!name || !claimRankMatch) return null;

  return {
    character: {
      name,
      series: series || 'Sem série identificada',
      rank: normalizeNumber(claimRankMatch[1]),
      likeRank: normalizeNumber(likeRankMatch?.[1] || 0),
      kakera: normalizeNumber(kakeraMatch?.[1] || 0),
      imageUrl,
      imageOptions: numberedImageMap,
      owner: ownerMatch?.[1] || '',
      ownedInSeries: ownerMatch ? normalizeNumber(ownerMatch[2]) : null,
      totalInSeries: ownerMatch ? normalizeNumber(ownerMatch[3]) : null,
      title: titleLine || '',
      note: '',
    },
    issues: [],
  };
}

function parseHaremBlock(block) {
  const lines = sanitizeLines(block);
  let title = '';
  let totalKakera = null;
  let currentSeries = null;
  const characters = [];
  const issues = [];

  lines.forEach((line) => {
    const totalMatch = line.match(/^Total value:\s*([\d.,]+):kakera:/i);
    if (totalMatch) {
      totalKakera = normalizeTotalValue(totalMatch[1]);
      return;
    }

    const seriesMatch = line.match(/^(.+?)\s*-\s*(\d+)\s*\/\s*(\d+)$/);
    if (seriesMatch && !line.startsWith('#')) {
      currentSeries = {
        name: seriesMatch[1].replace(/^【|】$/g, '').trim(),
        owned: normalizeNumber(seriesMatch[2]),
        total: normalizeNumber(seriesMatch[3]),
      };
      return;
    }

    if (!title && !line.startsWith('【') && !line.startsWith('#') && !line.includes(' ka') && !line.includes('http')) {
      title = line;
      return;
    }

    const charMatch = line.match(/^#([\d.]+)\s*-\s*(.+?)\s+(\d+)\s+ka(?:\s*-\s*(https?:\/\/\S+))?$/i);
    if (charMatch) {
      characters.push({
        name: charMatch[2].trim(),
        series: currentSeries?.name || 'Sem série identificada',
        rank: normalizeNumber(charMatch[1]),
        likeRank: 0,
        kakera: normalizeNumber(charMatch[3]),
        imageUrl: charMatch[4] || '',
        imageOptions: {},
        owner: '',
        ownedInSeries: currentSeries?.owned ?? null,
        totalInSeries: currentSeries?.total ?? null,
        title: '',
        note: '',
      });
      return;
    }

    if (line.startsWith('#') || line.includes(' ka') || line.includes('http')) {
      issues.push(makeIssue('warning', 'Linha parecida com personagem não foi interpretada.', line));
    }
  });

  return { title, totalKakera, characters, issues };
}

function parseMixedImport(raw) {
  const text = String(raw || '');
  const blocks = splitMixedBlocks(text);
  const result = { meta: { title: '', totalKakera: null }, characters: [], issues: [] };
  const map = new Map();

  blocks.forEach((block) => {
    if (!block.trim()) return;

    const harem = parseHaremBlock(block);
    if (harem.characters.length) {
      if (!result.meta.title && harem.title) result.meta.title = harem.title;
      if (harem.totalKakera !== null) result.meta.totalKakera = harem.totalKakera;
      harem.characters.forEach((character) => {
        const key = `${character.name}||${character.series}`.toLowerCase();
        const existing = map.get(key);
        if (existing) {
          Object.assign(existing, mergeCharacter(existing, character));
        } else {
          const prepared = prepareCharacter(character);
          result.characters.push(prepared);
          map.set(key, prepared);
        }
      });
      result.issues.push(...harem.issues);
    }

    const single = parseSingleCharacterBlock(block);
    if (single?.character) {
      const key = `${single.character.name}||${single.character.series}`.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        Object.assign(existing, mergeCharacter(existing, single.character));
      } else {
        const prepared = prepareCharacter(single.character);
        result.characters.push(prepared);
        map.set(key, prepared);
      }
      result.issues.push(...single.issues);
    }
  });

  if (!result.characters.length) {
    result.issues.push(makeIssue('error', 'Nenhum personagem foi identificado no texto importado.'));
  }

  result.characters = result.characters
    .sort((a, b) => a.position - b.position)
    .map((character, index) => ({ ...character, position: index + 1 }));

  return result;
}

function prepareCharacter(character) {
  return {
    id: character.id || uid(),
    position: character.position || 999999,
    name: String(character.name || 'Sem nome').trim(),
    series: String(character.series || 'Sem série identificada').trim(),
    rank: normalizeNumber(character.rank || 0),
    likeRank: normalizeNumber(character.likeRank || 0),
    kakera: normalizeNumber(character.kakera || 0),
    imageUrl: character.imageUrl || '',
    imageOptions: character.imageOptions || {},
    owner: character.owner || '',
    ownedInSeries: character.ownedInSeries ?? null,
    totalInSeries: character.totalInSeries ?? null,
    title: character.title || '',
    note: character.note || '',
    divorce: Boolean(character.divorce),
    createdAt: character.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function mergeCharacter(oldChar, newChar) {
  return {
    ...oldChar,
    ...newChar,
    imageOptions: { ...(oldChar.imageOptions || {}), ...(newChar.imageOptions || {}) },
    imageUrl: newChar.imageUrl || oldChar.imageUrl || '',
    likeRank: newChar.likeRank || oldChar.likeRank || 0,
    kakera: newChar.kakera || oldChar.kakera || 0,
    owner: newChar.owner || oldChar.owner || '',
    title: newChar.title || oldChar.title || '',
    note: newChar.note || oldChar.note || '',
    position: oldChar.position || newChar.position || 999999,
    updatedAt: new Date().toISOString(),
  };
}

async function api(action, method = 'GET', data = null) {
  const options = { method, headers: {} };
  let url = `api.php?action=${encodeURIComponent(action)}`;
  if (method !== 'GET' && data !== null) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`Falha HTTP ${response.status}`);
  return response.json();
}

async function loadDb() {
  try {
    const payload = await api('load');
    state.db = payload.db || createEmptyDb();
    localStorage.setItem(STORAGE_FALLBACK_KEY, JSON.stringify(state.db));
  } catch (error) {
    const fallback = localStorage.getItem(STORAGE_FALLBACK_KEY);
    state.db = fallback ? JSON.parse(fallback) : createEmptyDb();
    state.issues.unshift(makeIssue('warning', `Falha ao ler JSON do servidor, usando fallback local. ${error.message}`));
  }
  normalizeDb();
  renderAll();
  await loadBackups();
}

function normalizeDb() {
  if (!state.db) state.db = createEmptyDb();
  if (!Array.isArray(state.db.characters)) state.db.characters = [];
  if (!Array.isArray(state.db.trash)) state.db.trash = [];
  if (!state.db.meta) state.db.meta = { updatedAt: '', version: 1 };
  if (!state.db.lists) state.db.lists = { wishlist: [], likelist: [], whitelist: [], blacklist: [] };
  ['wishlist','likelist','whitelist','blacklist'].forEach((k) => {
    if (!Array.isArray(state.db.lists[k])) state.db.lists[k] = [];
  });
  state.db.characters = state.db.characters.map((character, index) => prepareCharacter({ ...character, position: character.position || index + 1 }))
    .sort((a,b)=>a.position-b.position)
    .map((character,index)=>({ ...character, position:index+1 }));
}

async function saveDb(showMessage = true) {
  normalizeDb();
  state.db.meta.updatedAt = new Date().toISOString();
  try {
    await api('save', 'POST', { db: state.db });
    localStorage.setItem(STORAGE_FALLBACK_KEY, JSON.stringify(state.db));
    if (showMessage) setCommandOutput('Banco salvo no servidor com sucesso.');
    await loadBackups();
  } catch (error) {
    localStorage.setItem(STORAGE_FALLBACK_KEY, JSON.stringify(state.db));
    state.issues.unshift(makeIssue('error', `Falha ao salvar no servidor: ${error.message}`));
    renderIssues();
  }
}

async function createBackup() {
  try {
    await api('backup', 'POST', {});
    setCommandOutput('Backup criado com sucesso.');
    await loadBackups();
  } catch (error) {
    state.issues.unshift(makeIssue('error', `Falha ao criar backup: ${error.message}`));
    renderIssues();
  }
}

async function loadBackups() {
  try {
    const payload = await api('list_backups');
    renderBackups(payload.backups || []);
  } catch (error) {
    renderBackups([]);
  }
}

async function restoreBackup(filename) {
  if (!confirm(`Restaurar backup ${filename}?`)) return;
  try {
    const payload = await api('restore_backup', 'POST', { filename });
    state.db = payload.db || createEmptyDb();
    normalizeDb();
    renderAll();
    setCommandOutput(`Backup restaurado: ${filename}`);
  } catch (error) {
    state.issues.unshift(makeIssue('error', `Falha ao restaurar backup: ${error.message}`));
    renderIssues();
  }
}

function renderBackups(backups) {
  const root = qs('#backupsList');
  if (!backups.length) {
    root.innerHTML = '<div class="card muted small">Nenhum backup encontrado.</div>';
    return;
  }
  root.innerHTML = backups.map((name) => `
    <div class="card">
      <div class="row space-between align-center">
        <span>${escapeHtml(name)}</span>
        <button data-restore="${escapeHtml(name)}">Restaurar</button>
      </div>
    </div>
  `).join('');
  root.querySelectorAll('[data-restore]').forEach((btn) => {
    btn.addEventListener('click', () => restoreBackup(btn.dataset.restore));
  });
}

function setCommandOutput(value) {
  qs('#commandOutput').value = value || '';
}

function renderStats() {
  qs('#statTotal').textContent = state.db.characters.length;
  qs('#statKakera').textContent = state.db.characters.reduce((sum, c) => sum + (c.kakera || 0), 0).toLocaleString('pt-BR');
  qs('#statDivorce').textContent = state.db.characters.filter((c) => c.divorce).length;
  qs('#statTrash').textContent = state.db.trash.length;
}

function currentFilters() {
  return {
    search: qs('#searchInput').value.trim().toLowerCase(),
    series: qs('#seriesFilter').value,
    status: qs('#statusFilter').value,
    sort: qs('#sortFilter').value,
  };
}

function renderSeriesFilter() {
  const select = qs('#seriesFilter');
  const current = select.value;
  const series = [...new Set(state.db.characters.map((c) => c.series).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  select.innerHTML = '<option value="">Todas as séries</option>' + series.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
  if (series.includes(current)) select.value = current;
}

function applyFilters() {
  const { search, series, status, sort } = currentFilters();
  let list = [...state.db.characters];

  if (search) {
    list = list.filter((character) => {
      const tags = listTagsForCharacter(character).join(' ');
      return [character.name, character.series, character.note, character.owner, character.title, String(character.rank), String(character.likeRank), String(character.kakera), tags]
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
  }

  if (series) list = list.filter((character) => character.series === series);
  if (status) {
    if (status === 'divorce') list = list.filter((character) => character.divorce);
    else list = list.filter((character) => isInList(status, character.name));
  }

  list.sort((a, b) => {
    if (sort === 'position') return a.position - b.position;
    if (sort === 'kakera') return b.kakera - a.kakera;
    if (sort === 'rank') return a.rank - b.rank;
    if (sort === 'likeRank') return a.likeRank - b.likeRank;
    return String(a[sort] || '').localeCompare(String(b[sort] || ''), 'pt-BR');
  });

  state.filtered = list;
}

function previewSrc(character) {
  if (!character.imageUrl) return '';
  return `image_proxy.php?url=${encodeURIComponent(character.imageUrl)}`;
}

function renderCharacters() {
  applyFilters();
  const tbody = qs('#charactersBody');
  if (!state.filtered.length) {
    tbody.innerHTML = '<tr><td colspan="12" class="muted">Nenhum personagem encontrado.</td></tr>';
    return;
  }

  tbody.innerHTML = state.filtered.map((character) => {
    const tags = listTagsForCharacter(character);
    const preview = character.imageUrl
      ? `<img class="thumb" src="${previewSrc(character)}" alt="${escapeHtml(character.name)}" loading="lazy" onerror="this.outerHTML='<div class=&quot;thumb-placeholder&quot;>sem preview</div>';">`
      : '<div class="thumb-placeholder">sem imagem</div>';
    return `
      <tr draggable="${currentFilters().sort === 'position'}" data-id="${character.id}">
        <td><input type="checkbox" data-select="${character.id}" ${state.selected.has(character.id) ? 'checked' : ''}></td>
        <td><span class="drag-handle" title="Arrastar">⋮⋮</span></td>
        <td>${character.position}</td>
        <td>${preview}</td>
        <td>
          <strong>${escapeHtml(character.name)}</strong>
          ${character.title ? `<div class="small muted">${escapeHtml(character.title)}</div>` : ''}
          ${character.owner ? `<div class="small muted">Owner: ${escapeHtml(character.owner)}</div>` : ''}
          ${character.imageUrl ? `<div class="actions"><a href="${escapeHtml(character.imageUrl)}" target="_blank">abrir imagem</a></div>` : ''}
        </td>
        <td>${escapeHtml(character.series)}</td>
        <td>#${Number(character.rank || 0).toLocaleString('pt-BR')}</td>
        <td>${character.likeRank ? '#' + Number(character.likeRank).toLocaleString('pt-BR') : '-'}</td>
        <td>${Number(character.kakera || 0).toLocaleString('pt-BR')}</td>
        <td>${tags.length ? tags.map((tag) => `<span class="tag">${tag}</span>`).join('') : '<span class="muted small">-</span>'}</td>
        <td><input type="checkbox" data-divorce="${character.id}" ${character.divorce ? 'checked' : ''}></td>
        <td class="actions">
          <button data-edit="${character.id}">Editar</button>
          <button data-trash="${character.id}">Lixeira</button>
          <button data-delete="${character.id}">Remover</button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-select]').forEach((el) => {
    el.addEventListener('change', () => {
      if (el.checked) state.selected.add(el.dataset.select);
      else state.selected.delete(el.dataset.select);
    });
  });

  tbody.querySelectorAll('[data-divorce]').forEach((el) => {
    el.addEventListener('change', () => {
      const character = state.db.characters.find((item) => item.id === el.dataset.divorce);
      if (!character) return;
      character.divorce = el.checked;
      renderStats();
    });
  });

  tbody.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => openModal(btn.dataset.edit)));
  tbody.querySelectorAll('[data-trash]').forEach((btn) => btn.addEventListener('click', () => moveCharacterToTrash(btn.dataset.trash)));
  tbody.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', () => deleteCharacter(btn.dataset.delete)));

  if (currentFilters().sort === 'position') {
    tbody.querySelectorAll('tr[data-id]').forEach((row) => {
      row.addEventListener('dragstart', () => {
        state.dragId = row.dataset.id;
        row.classList.add('dragging');
      });
      row.addEventListener('dragend', () => {
        state.dragId = null;
        row.classList.remove('dragging');
      });
      row.addEventListener('dragover', (event) => {
        event.preventDefault();
      });
      row.addEventListener('drop', (event) => {
        event.preventDefault();
        if (!state.dragId || state.dragId === row.dataset.id) return;
        reorderByDrag(state.dragId, row.dataset.id);
      });
    });
  }
}

function reorderByDrag(dragId, targetId) {
  const ordered = [...state.db.characters].sort((a,b)=>a.position-b.position);
  const fromIndex = ordered.findIndex((item) => item.id === dragId);
  const toIndex = ordered.findIndex((item) => item.id === targetId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
  const [moved] = ordered.splice(fromIndex, 1);
  ordered.splice(toIndex, 0, moved);
  state.db.characters = ordered.map((character, index) => ({ ...character, position: index + 1 }));
  renderAll();
}

function renderIssues() {
  const root = qs('#issuesList');
  const merged = state.issues.slice(0, 100);
  if (!merged.length) {
    root.innerHTML = '<div class="card muted small">Nenhum erro ou aviso.</div>';
    return;
  }
  root.innerHTML = merged.map((issue) => `
    <div class="card">
      <strong>${issue.kind === 'error' ? 'Erro' : 'Aviso'}</strong>
      <div>${escapeHtml(issue.message)}</div>
      ${issue.line ? `<pre class="small">${escapeHtml(issue.line)}</pre>` : ''}
    </div>
  `).join('');
}

function renderTrash() {
  const root = qs('#trashList');
  if (!state.db.trash.length) {
    root.innerHTML = '<div class="card muted small">Lixeira vazia.</div>';
    return;
  }
  root.innerHTML = state.db.trash.map((character) => `
    <div class="card">
      <div class="row space-between align-center">
        <div>
          <strong>${escapeHtml(character.name)}</strong>
          <div class="small muted">${escapeHtml(character.series)}</div>
        </div>
        <div class="actions">
          <button data-restore-trash="${character.id}">Restaurar</button>
          <button data-delete-trash="${character.id}">Excluir</button>
        </div>
      </div>
    </div>
  `).join('');
  root.querySelectorAll('[data-restore-trash]').forEach((btn) => btn.addEventListener('click', () => restoreFromTrash(btn.dataset.restoreTrash)));
  root.querySelectorAll('[data-delete-trash]').forEach((btn) => btn.addEventListener('click', () => deleteFromTrash(btn.dataset.deleteTrash)));
}

function renderListPreview() {
  const root = qs('#listPreview');
  const listName = state.activeList;
  const items = state.db.lists[listName] || [];
  root.innerHTML = items.length
    ? items.map((item) => `<div class="card">${escapeHtml(item)}</div>`).join('')
    : '<div class="card muted small">Lista vazia.</div>';
}

function renderAll() {
  renderSeriesFilter();
  renderStats();
  renderCharacters();
  renderIssues();
  renderTrash();
  renderListPreview();
}

function importIntoDb(parsed, replace = false) {
  if (replace) {
    state.db = createEmptyDb();
  }
  const map = new Map(state.db.characters.map((character) => [`${character.name}||${character.series}`.toLowerCase(), character]));
  parsed.characters.forEach((incoming) => {
    const prepared = prepareCharacter(incoming);
    const key = `${prepared.name}||${prepared.series}`.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      Object.assign(existing, mergeCharacter(existing, prepared));
    } else {
      prepared.position = state.db.characters.length + 1;
      state.db.characters.push(prepared);
      map.set(key, prepared);
    }
  });
  state.db.characters = state.db.characters
    .sort((a,b)=>a.position-b.position)
    .map((character,index)=>({ ...character, position:index+1 }));
  if (parsed.meta?.title) state.db.meta.title = parsed.meta.title;
  if (parsed.meta?.totalKakera !== null && parsed.meta?.totalKakera !== undefined) state.db.meta.totalKakera = parsed.meta.totalKakera;
  state.issues = parsed.issues || [];
}

function parseNamesOnly(raw) {
  return sanitizeLines(raw)
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter((line) => line && !/^Rank de/i.test(line) && !/:kakera:/i.test(line) && !/^https?:\/\//i.test(line) && !/^Pertence a /i.test(line))
    .filter((line) => !/ - \d+\/\d+$/.test(line))
    .filter((line) => !/^#\d+/.test(line))
    .filter((line) => !/:female:|:male:/i.test(line));
}

function openModal(id) {
  const character = state.db.characters.find((item) => item.id === id);
  if (!character) return;
  state.modalId = id;
  qs('#modalTitle').textContent = `Editar: ${character.name}`;
  qs('#editName').value = character.name;
  qs('#editSeries').value = character.series;
  qs('#editRank').value = character.rank || 0;
  qs('#editLikeRank').value = character.likeRank || 0;
  qs('#editKakera').value = character.kakera || 0;
  qs('#editPosition').value = character.position || 1;
  qs('#editOwner').value = character.owner || '';
  qs('#editNote').value = character.note || '';
  qs('#editImageUrl').value = character.imageUrl || '';
  qs('#editImportText').value = '';
  qs('#editWishlist').checked = isInList('wishlist', character.name);
  qs('#editLikelist').checked = isInList('likelist', character.name);
  qs('#editWhitelist').checked = isInList('whitelist', character.name);
  qs('#editBlacklist').checked = isInList('blacklist', character.name);
  qs('#editDivorce').checked = Boolean(character.divorce);
  updateModalPreview();
  qs('#modalOverlay').classList.remove('hidden');
}

function closeModal() {
  state.modalId = null;
  qs('#modalOverlay').classList.add('hidden');
}

function updateModalPreview() {
  const img = qs('#editPreview');
  const url = qs('#editImageUrl').value.trim();
  if (!url) {
    img.removeAttribute('src');
    return;
  }
  img.src = `image_proxy.php?url=${encodeURIComponent(url)}`;
}

function saveModalCharacter() {
  const character = state.db.characters.find((item) => item.id === state.modalId);
  if (!character) return;
  const oldName = character.name;
  character.name = qs('#editName').value.trim() || character.name;
  character.series = qs('#editSeries').value.trim() || 'Sem série identificada';
  character.rank = normalizeNumber(qs('#editRank').value);
  character.likeRank = normalizeNumber(qs('#editLikeRank').value);
  character.kakera = normalizeNumber(qs('#editKakera').value);
  character.position = Math.max(1, normalizeNumber(qs('#editPosition').value) || character.position);
  character.owner = qs('#editOwner').value.trim();
  character.note = qs('#editNote').value;
  character.imageUrl = qs('#editImageUrl').value.trim();
  character.divorce = qs('#editDivorce').checked;
  character.updatedAt = new Date().toISOString();

  ['wishlist','likelist','whitelist','blacklist'].forEach((listName) => {
    setInList(listName, oldName, false);
  });
  setInList('wishlist', character.name, qs('#editWishlist').checked);
  setInList('likelist', character.name, qs('#editLikelist').checked);
  setInList('whitelist', character.name, qs('#editWhitelist').checked);
  setInList('blacklist', character.name, qs('#editBlacklist').checked);

  state.db.characters = state.db.characters
    .sort((a,b)=>a.position-b.position)
    .map((item,index)=>({ ...item, position:index+1 }));
  renderAll();
  closeModal();
}

function applySingleImportToModal() {
  const text = qs('#editImportText').value.trim();
  if (!text || !state.modalId) return;
  const parsed = parseMixedImport(text);
  if (!parsed.characters.length) {
    state.issues.unshift(makeIssue('warning', 'Nenhum dado útil foi encontrado no texto individual.'));
    renderIssues();
    return;
  }
  const first = parsed.characters[0];
  qs('#editName').value = first.name || qs('#editName').value;
  qs('#editSeries').value = first.series || qs('#editSeries').value;
  if (first.rank) qs('#editRank').value = first.rank;
  if (first.likeRank) qs('#editLikeRank').value = first.likeRank;
  if (first.kakera) qs('#editKakera').value = first.kakera;
  if (first.owner) qs('#editOwner').value = first.owner;
  if (first.title) qs('#editNote').value = [qs('#editNote').value, first.title].filter(Boolean).join('\n');
  if (first.imageUrl) qs('#editImageUrl').value = first.imageUrl;
  updateModalPreview();
  if (parsed.issues.length) {
    state.issues = [...parsed.issues, ...state.issues].slice(0, 100);
    renderIssues();
  }
}

function moveCharacterToTrash(id) {
  const idx = state.db.characters.findIndex((item) => item.id === id);
  if (idx < 0) return;
  const [removed] = state.db.characters.splice(idx, 1);
  state.db.trash.unshift({ ...removed, trashedAt: new Date().toISOString() });
  state.db.characters = state.db.characters.map((character, index) => ({ ...character, position: index + 1 }));
  state.selected.delete(id);
  renderAll();
}

function restoreFromTrash(id) {
  const idx = state.db.trash.findIndex((item) => item.id === id);
  if (idx < 0) return;
  const [restored] = state.db.trash.splice(idx, 1);
  restored.position = state.db.characters.length + 1;
  state.db.characters.push(restored);
  renderAll();
}

function deleteCharacter(id) {
  if (!confirm('Remover personagem do banco?')) return;
  state.db.characters = state.db.characters.filter((item) => item.id !== id).map((character, index) => ({ ...character, position: index + 1 }));
  state.selected.delete(id);
  renderAll();
  closeModal();
}

function deleteFromTrash(id) {
  state.db.trash = state.db.trash.filter((item) => item.id !== id);
  renderTrash();
  renderStats();
}

function bindEvents() {
  qs('#saveBtn').addEventListener('click', () => saveDb(true));
  qs('#backupBtn').addEventListener('click', createBackup);
  qs('#reloadBtn').addEventListener('click', loadDb);

  qs('#importMergeBtn').addEventListener('click', () => {
    const parsed = parseMixedImport(qs('#importInput').value);
    importIntoDb(parsed, false);
    renderAll();
    qs('#importSummary').textContent = `Importados/atualizados: ${parsed.characters.length}. Avisos/erros: ${parsed.issues.length}.`;
  });
  qs('#importReplaceBtn').addEventListener('click', () => {
    const parsed = parseMixedImport(qs('#importInput').value);
    importIntoDb(parsed, true);
    renderAll();
    qs('#importSummary').textContent = `Banco substituído. Personagens: ${parsed.characters.length}. Avisos/erros: ${parsed.issues.length}.`;
  });
  qs('#clearImportBtn').addEventListener('click', () => {
    qs('#importInput').value = '';
    qs('#importSummary').textContent = '';
  });

  qs('#genSortBtn').addEventListener('click', () => {
    const ordered = [...state.db.characters].sort((a,b)=>a.position-b.position).map((c) => c.name);
    setCommandOutput(chunkCommand('$sm ', ordered));
  });
  qs('#genDivorceBtn').addEventListener('click', () => {
    const names = state.db.characters.filter((c) => c.divorce).map((c) => c.name);
    setCommandOutput(names.length ? chunkCommand('$divorce ', names) : '');
  });
  qs('#genDivorceAllButBtn').addEventListener('click', () => {
    const names = state.db.characters.filter((c) => !c.divorce).map((c) => c.name);
    setCommandOutput(names.length ? chunkCommand('$divorceallbut ', names) : '$divorceall');
  });

  qs('#removeDivorcedBtn').addEventListener('click', () => {
    const before = state.db.characters.length;
    state.db.characters = state.db.characters.filter((c) => !c.divorce).map((character,index)=>({ ...character, position:index+1 }));
    state.selected.clear();
    renderAll();
    setCommandOutput(`${before - state.db.characters.length} personagem(ns) removidos do banco.`);
  });

  qs('#trashDivorcedBtn').addEventListener('click', () => {
    const toTrash = state.db.characters.filter((c) => c.divorce);
    if (!toTrash.length) return;
    state.db.trash.unshift(...toTrash.map((c) => ({ ...c, trashedAt: new Date().toISOString() })));
    state.db.characters = state.db.characters.filter((c) => !c.divorce).map((character,index)=>({ ...character, position:index+1 }));
    state.selected.clear();
    renderAll();
    setCommandOutput(`${toTrash.length} personagem(ns) movidos para a lixeira.`);
  });

  qs('#emptyTrashBtn').addEventListener('click', () => {
    if (!confirm('Esvaziar a lixeira?')) return;
    state.db.trash = [];
    renderTrash();
    renderStats();
  });

  qsa('.tab').forEach((btn) => btn.addEventListener('click', () => {
    qsa('.tab').forEach((el) => el.classList.remove('active'));
    btn.classList.add('active');
    state.activeList = btn.dataset.list;
    renderListPreview();
  }));

  qs('#importListBtn').addEventListener('click', () => {
    const names = parseNamesOnly(qs('#listInput').value);
    const merged = [...new Set([...(state.db.lists[state.activeList] || []), ...names])].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    state.db.lists[state.activeList] = merged;
    renderListPreview();
  });
  qs('#clearListBtn').addEventListener('click', () => { qs('#listInput').value = ''; });

  ['#searchInput','#seriesFilter','#statusFilter','#sortFilter'].forEach((sel) => {
    qs(sel).addEventListener('input', renderAll);
    qs(sel).addEventListener('change', renderAll);
  });

  qs('#selectFilteredBtn').addEventListener('click', () => {
    state.filtered.forEach((character) => state.selected.add(character.id));
    renderCharacters();
  });
  qs('#clearSelectionBtn').addEventListener('click', () => {
    state.selected.clear();
    renderCharacters();
  });
  qs('#markDivorceBtn').addEventListener('click', () => {
    state.db.characters.forEach((character) => { if (state.selected.has(character.id)) character.divorce = true; });
    renderAll();
  });
  qs('#unmarkDivorceBtn').addEventListener('click', () => {
    state.db.characters.forEach((character) => { if (state.selected.has(character.id)) character.divorce = false; });
    renderAll();
  });

  qs('#refreshBackupsBtn').addEventListener('click', loadBackups);

  qs('#closeModalBtn').addEventListener('click', closeModal);
  qs('#modalOverlay').addEventListener('click', (event) => { if (event.target.id === 'modalOverlay') closeModal(); });
  qs('#editImageUrl').addEventListener('input', updateModalPreview);
  qs('#applySingleImportBtn').addEventListener('click', applySingleImportToModal);
  qs('#clearSingleImportBtn').addEventListener('click', () => { qs('#editImportText').value = ''; });
  qs('#saveCharacterBtn').addEventListener('click', saveModalCharacter);
  qs('#trashCharacterBtn').addEventListener('click', () => {
    if (!state.modalId) return;
    moveCharacterToTrash(state.modalId);
    closeModal();
  });
  qs('#deleteCharacterBtn').addEventListener('click', () => {
    if (!state.modalId) return;
    deleteCharacter(state.modalId);
  });
}

function chunkCommand(prefix, names) {
  const chunks = [];
  let current = prefix;
  names.forEach((name) => {
    const token = (current === prefix ? '' : ' $ ') + name;
    if ((current + token).length > 1800) {
      chunks.push(current);
      current = prefix + name;
    } else {
      current += token;
    }
  });
  if (current.trim()) chunks.push(current);
  return chunks.join('\n\n');
}

document.addEventListener('DOMContentLoaded', async () => {
  bindEvents();
  await loadDb();
});
