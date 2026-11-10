const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { abrirChamado, resolverChamado, ErroDeAtendimento } = require('./chamados');

const db = new PrismaClient();
const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, '..', 'public');
const arquivos = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8']
};
const relacoes = {
  autor: true,
  categoria: true,
  eventos: { include: { usuario: true }, orderBy: { id: 'asc' } }
};

function responder(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(dados));
}

async function lerJson(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) {
    throw new ErroDeAtendimento('Envie os dados em JSON.', 415);
  }
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 100000) {
      throw new ErroDeAtendimento('O conteúdo enviado é muito grande.', 413);
    }
  }
  try {
    const dados = JSON.parse(body);
    if (!dados || Array.isArray(dados) || typeof dados !== 'object') throw Error();
    return dados;
  } catch {
    throw new ErroDeAtendimento('Os dados enviados são inválidos.');
  }
}

async function listar(url) {
  const termo = (url.searchParams.get('termo') || '').trim();
  const categoria = url.searchParams.get('categoria') || '';
  const status = url.searchParams.get('status') || '';
  const pagina = Number(url.searchParams.get('pagina') || 1);
  if (!Number.isSafeInteger(pagina) || pagina < 1 || pagina > 100000 || termo.length > 200) {
    throw new ErroDeAtendimento('Filtro ou página inválidos.');
  }
  if (status && !['ABERTO', 'RESOLVIDO'].includes(status)) {
    throw new ErroDeAtendimento('Situação inválida.');
  }
  const where = {};
  if (categoria) where.categoria = { nome: categoria };
  if (status) where.status = status;
  if (termo) {
    const filtro = { contains: termo, mode: 'insensitive' };
    where.OR = [{ titulo: filtro }, { descricao: filtro }];
  }
  const [total, chamados] = await db.$transaction([
    db.chamado.count({ where }),
    db.chamado.findMany({
      where, include: { autor: true, categoria: true },
      orderBy: { id: 'desc' }, skip: (pagina - 1) * 12, take: 12
    })
  ]);
  return { total, pagina, paginas: Math.max(1, Math.ceil(total / 12)), chamados };
}

async function rota(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; frame-ancestors 'none'");
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'POST') {
    const origem = req.headers.origin;
    if (origem && !['http://localhost:' + port, 'http://127.0.0.1:' + port].includes(origem)) {
      throw new ErroDeAtendimento('Origem da requisição inválida.', 403);
    }
  }
  if (req.method === 'GET' && arquivos[url.pathname]) {
    const [arquivo, tipo] = arquivos[url.pathname];
    const body = await fs.readFile(path.join(publicDir, arquivo));
    res.writeHead(200, { 'Content-Type': tipo });
    res.end(body);
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/inicio') {
    const [usuarios, categorias, total, abertos, resolvidos] = await db.$transaction([
      db.usuario.findMany({ orderBy: { nome: 'asc' } }),
      db.categoria.findMany({ orderBy: { nome: 'asc' } }),
      db.chamado.count(),
      db.chamado.count({ where: { status: 'ABERTO' } }),
      db.chamado.count({ where: { status: 'RESOLVIDO' } })
    ]);
    return responder(res, 200, { usuarios, categorias, total, abertos, resolvidos });
  }
  if (req.method === 'GET' && url.pathname === '/api/chamados') {
    return responder(res, 200, await listar(url));
  }
  if (req.method === 'POST' && url.pathname === '/api/chamados') {
    const chamado = await abrirChamado(db, await lerJson(req));
    return responder(res, 201, chamado);
  }
  const match = url.pathname.match(/^\/api\/chamados\/(\d+)(?:\/(resolver|falha))?$/);
  if (match) {
    const id = Number(match[1]);
    if (!Number.isSafeInteger(id) || id <= 0) throw new ErroDeAtendimento('ID inválido.');
    if (req.method === 'GET' && !match[2]) {
      const chamado = await db.chamado.findUniqueOrThrow({ where: { id }, include: relacoes });
      return responder(res, 200, chamado);
    }
    if (req.method === 'POST' && match[2]) {
      await resolverChamado(db, id, await lerJson(req), match[2] === 'falha');
      return responder(res, 200, { mensagem: 'Chamado resolvido e histórico registrado.' });
    }
  }
  responder(res, 404, { erro: 'Página ou recurso não encontrado.' });
}

const server = http.createServer((req, res) => {
  rota(req, res).catch(error => {
    if (error instanceof ErroDeAtendimento) {
      return responder(res, error.status, { erro: error.message, codigo: error.code });
    }
    if (error.code === 'P2025') {
      return responder(res, 404, { erro: 'Chamado, usuário ou categoria não encontrado.' });
    }
    if (error.code === 'P2002') {
      return responder(res, 409, { erro: 'Já existe um registro com esses dados.' });
    }
    console.error(error.message);
    responder(res, 503, { erro: 'Não foi possível acessar o banco. Confira o Docker e a conexão no .env.' });
  });
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? 'A porta ' + port + ' já está em uso. Encerre a outra execução ou configure PORT.'
    : error.message);
  process.exitCode = 1;
  db.$disconnect();
});
server.listen(port, '127.0.0.1', () => {
  console.log('Helpdesk disponível em http://localhost:' + port);
});
async function encerrar() {
  server.close();
  await db.$disconnect();
}
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
