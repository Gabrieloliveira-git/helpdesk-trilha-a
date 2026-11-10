const $ = id => document.getElementById(id);
const state = { usuarios: [], categorias: [], pagina: 1, paginas: 1, chamado: null, request: 0, detailRequest: 0 };
const numero = value => new Intl.NumberFormat('pt-BR').format(value);
const data = value => new Date(value).toLocaleDateString('pt-BR');
const horario = value => new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const statusHtml = status => status === 'ABERTO'
  ? '<span class="status status-open">◷ Em aberto</span>'
  : '<span class="status status-done">✓ Resolvido</span>';

async function api(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) {
    const error = new Error(body.erro || 'Não foi possível concluir a operação.');
    error.code = body.codigo;
    throw error;
  }
  return body;
}

function mensagem(id, text) {
  $(id).textContent = text;
  $(id).hidden = !text;
}

function opcoes(items, field, label) {
  return items.map(item => '<option value="' + escapeHtml(item[field]) + '">' + escapeHtml(item[label]) + '</option>').join('');
}

async function carregarResumo() {
  const result = await api('/api/inicio');
  state.usuarios = result.usuarios;
  state.categorias = result.categorias;
  $('stat-total').textContent = numero(result.total);
  $('stat-open').textContent = numero(result.abertos);
  $('stat-done').textContent = numero(result.resolvidos);
  $('nav-total').textContent = numero(result.total);
  $('connection').className = 'connection online';
  $('connection').innerHTML = '<i></i> PostgreSQL conectado';
  const category = $('category-filter').value;
  $('category-filter').innerHTML = '<option value="">Todas as categorias</option>' + opcoes(state.categorias, 'nome', 'nome');
  $('category-filter').value = category;
  $('author').innerHTML = opcoes(state.usuarios, 'email', 'nome');
  $('category').innerHTML = opcoes(state.categorias, 'nome', 'nome');
  $('new-ticket').disabled = !state.usuarios.length || !state.categorias.length;
}

async function carregarLista() {
  const request = ++state.request;
  const params = new URLSearchParams(new FormData($('filters')));
  params.set('pagina', state.pagina);
  $('tickets').setAttribute('aria-busy', 'true');
  const result = await api('/api/chamados?' + params);
  if (request !== state.request) return;
  state.paginas = result.paginas;
  if (state.pagina > result.paginas) {
    state.pagina = result.paginas;
    return carregarLista();
  }
  $('tickets').innerHTML = result.chamados.map(chamado => '<tr>' +
    '<td><button class="ticket-button" data-ticket="' + chamado.id + '">' + escapeHtml(chamado.titulo) +
    '</button><span class="ticket-id">#' + chamado.id + '</span></td>' +
    '<td><span class="category-pill">' + escapeHtml(chamado.categoria.nome) + '</span></td>' +
    '<td><span class="person"><span class="person-icon">' + escapeHtml(chamado.autor.nome.slice(0, 1)) +
    '</span>' + escapeHtml(chamado.autor.nome) + '</span></td>' +
    '<td>' + statusHtml(chamado.status) + '</td>' +
    '<td class="date">' + data(chamado.criadoEm) + '</td>' +
    '<td><button class="arrow-button" data-ticket="' + chamado.id + '" aria-label="Abrir chamado ' + chamado.id + '">↗</button></td></tr>'
  ).join('');
  $('tickets').setAttribute('aria-busy', 'false');
  $('empty').hidden = result.total !== 0;
  $('results').textContent = result.total
    ? 'Exibindo ' + ((state.pagina - 1) * 12 + 1) + '–' + Math.min(state.pagina * 12, result.total) + ' de ' + numero(result.total) + ' chamados'
    : '0 chamados';
  $('page-number').textContent = state.pagina + ' / ' + state.paginas;
  $('previous').disabled = state.pagina <= 1;
  $('next').disabled = state.pagina >= state.paginas;
}

async function atualizar() {
  mensagem('global-error', '');
  try {
    await carregarResumo();
    await carregarLista();
  } catch (error) {
    $('connection').className = 'connection offline';
    $('connection').innerHTML = '<i></i> Conexão indisponível';
    $('tickets').setAttribute('aria-busy', 'false');
    $('results').textContent = 'Falha ao atualizar. Tente novamente.';
    mensagem('global-error', error.message);
  }
}

function renderDetalhes(chamado, rollback = false) {
  state.chamado = chamado;
  $('detail-id').textContent = 'CHAMADO #' + chamado.id;
  const eventos = chamado.eventos.map(evento => '<li><strong>' +
    (evento.status === 'ABERTO' ? 'Chamado aberto' : 'Chamado resolvido') +
    ' por ' + escapeHtml(evento.usuario.nome) + '</strong><span>' + horario(evento.criadoEm) + ' · Evento #' + evento.id + '</span></li>').join('');
  const rollbackHtml = rollback ? '<div class="rollback" role="status"><strong>Transação revertida com sucesso</strong>' +
    'A falha foi provocada após a atualização. O banco foi consultado novamente: situação ' +
    (chamado.status === 'ABERTO' ? 'em aberto' : 'resolvido') + ', ' + chamado.eventos.length +
    ' evento(s) no histórico. Confira a ficha abaixo.</div>' : '';
  const solucao = chamado.solucao ? '<section class="detail-section solution"><h3>✓ Solução registrada</h3><p>' +
    escapeHtml(chamado.solucao) + '</p></section>' : '';
  const resolver = chamado.status === 'ABERTO'
    ? '<form id="resolve-form" class="resolve-form"><h3>Concluir atendimento</h3>' +
      '<label for="responsavel">Responsável pela resolução</label><select id="responsavel" name="email" required>' +
      opcoes(state.usuarios, 'email', 'nome') + '</select>' +
      '<label for="solucao">Como o problema foi resolvido?</label><textarea id="solucao" name="solucao" rows="3" required maxlength="20000" placeholder="Registre a solução para ajudar no próximo atendimento."></textarea>' +
      '<div class="resolve-actions"><button class="primary" type="submit" name="acao" value="resolver">✓ Resolver chamado</button>' +
      '<button class="demo" type="submit" name="acao" value="falha">Simular falha da transação</button></div>' +
      '<p class="demo-note">A simulação interrompe a operação antes de gravar o evento, para demonstrar a reversão das alterações.</p></form>'
    : '';
  $('detail-content').innerHTML = rollbackHtml +
    '<h2 class="detail-title">' + escapeHtml(chamado.titulo) + '</h2>' +
    '<div class="detail-meta">' + statusHtml(chamado.status) + '<span class="category-pill">' +
    escapeHtml(chamado.categoria.nome) + '</span><span>Aberto por ' + escapeHtml(chamado.autor.nome) +
    '</span><span>' + horario(chamado.criadoEm) + '</span></div>' +
    '<section class="detail-section"><h3>Descrição do problema</h3><p>' + escapeHtml(chamado.descricao) +
    '</p></section>' + solucao +
    '<section class="detail-section"><h3>Histórico do atendimento <span class="ticket-id">' +
    chamado.eventos.length + ' evento(s) registrado(s)</span></h3><ol class="timeline">' + eventos + '</ol></section>' + resolver;
  if (resolver) {
    const bruno = state.usuarios.find(usuario => usuario.email === 'bruno@exemplo.test');
    if (bruno) $('responsavel').value = bruno.email;
    $('resolve-form').addEventListener('submit', resolverFormulario);
  }
}

async function abrirDetalhes(id) {
  const request = ++state.detailRequest;
  mensagem('detail-error', '');
  $('detail-id').textContent = 'CHAMADO #' + id;
  $('detail-content').textContent = 'Carregando atendimento…';
  if (!$('detail-dialog').open) $('detail-dialog').showModal();
  try {
    const chamado = await api('/api/chamados/' + id);
    if (request === state.detailRequest) renderDetalhes(chamado);
  } catch (error) {
    if (request === state.detailRequest) mensagem('detail-error', error.message);
  }
}

async function resolverFormulario(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const dados = Object.fromEntries(new FormData(form));
  const acao = event.submitter?.value || 'resolver';
  const id = state.chamado.id;
  const buttons = [...form.querySelectorAll('button')];
  buttons.forEach(button => { button.disabled = true; });
  mensagem('detail-error', '');
  try {
    await api('/api/chamados/' + id + '/' + acao, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados)
    });
    await abrirDetalhes(id);
    mensagem('notice', 'Chamado #' + id + ' resolvido. Solução e histórico registrados juntos.');
    await atualizar();
  } catch (error) {
    if (error.code === 'TRANSACAO_REVERTIDA') {
      try {
        const chamado = await api('/api/chamados/' + id);
        renderDetalhes(chamado, true);
        if ($('solucao')) {
          $('solucao').value = dados.solucao;
          $('responsavel').value = dados.email;
        }
        $('detail-dialog').scrollTop = 0;
      } catch (readError) {
        mensagem('detail-error', 'A simulação foi revertida, mas a leitura seguinte falhou. ' + readError.message);
      }
    } else {
      mensagem('detail-error', error.message);
    }
  } finally {
    buttons.forEach(button => { button.disabled = false; });
  }
}

$('filters').addEventListener('submit', event => {
  event.preventDefault();
  state.pagina = 1;
  atualizar();
});
for (const id of ['category-filter', 'status-filter']) {
  $(id).addEventListener('change', () => { state.pagina = 1; atualizar(); });
}
$('refresh').addEventListener('click', atualizar);
$('previous').addEventListener('click', () => { state.pagina--; atualizar(); });
$('next').addEventListener('click', () => { state.pagina++; atualizar(); });
$('clear-filters').addEventListener('click', () => {
  $('filters').reset(); state.pagina = 1; atualizar();
});
$('tickets').addEventListener('click', event => {
  const button = event.target.closest('[data-ticket]');
  if (button) abrirDetalhes(Number(button.dataset.ticket));
});
document.querySelectorAll('[data-close]').forEach(button => {
  button.addEventListener('click', () => $(button.dataset.close).close());
});
$('detail-dialog').addEventListener('close', () => { state.detailRequest++; });
$('new-ticket').addEventListener('click', () => {
  $('create-form').reset();
  mensagem('create-error', '');
  $('create-dialog').showModal();
});
$('create-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  mensagem('create-error', '');
  try {
    const chamado = await api('/api/chamados', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))
    });
    $('create-dialog').close();
    mensagem('notice', 'Chamado #' + chamado.id + ' aberto. O primeiro evento já está no histórico.');
    await atualizar();
    await abrirDetalhes(chamado.id);
  } catch (error) {
    mensagem('create-error', error.message);
  } finally {
    button.disabled = false;
  }
});
function navegar(solucoes) {
  $('nav-solucoes').classList.toggle('active', solucoes);
  $('nav-chamados').classList.toggle('active', !solucoes);
  $('breadcrumb').textContent = solucoes ? 'Base de soluções' : 'Chamados';
  $('page-title').innerHTML = solucoes ? 'Uma boa solução<br>merece ser compartilhada.' : 'Todo atendimento,<br>um passo à frente.';
  $('page-subtitle').textContent = solucoes ? 'Encontre respostas nos atendimentos que já foram resolvidos.' : 'Organize chamados e transforme soluções em conhecimento.';
  $('list-title').textContent = solucoes ? 'Conhecimento da equipe' : 'Chamados recentes';
  $('list-description').textContent = solucoes ? 'Busque por assunto e abra um chamado para consultar a solução.' : 'Acompanhe o que precisa de atenção.';
  $('filters').reset();
  $('status-filter').value = solucoes ? 'RESOLVIDO' : '';
  state.pagina = 1;
  atualizar();
}
$('nav-chamados').addEventListener('click', () => navegar(false));
$('nav-solucoes').addEventListener('click', () => navegar(true));
atualizar();
