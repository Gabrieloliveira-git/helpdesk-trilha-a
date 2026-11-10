// Regras compartilhadas entre o terminal e a interface web.
class ErroDeAtendimento extends Error {
  constructor(message, status = 400, code = 'VALIDACAO') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function textoObrigatorio(valor, campo, limite = 20000) {
  if (typeof valor !== 'string' || !valor.trim() || valor.length > limite) {
    throw new ErroDeAtendimento(campo + ' deve ser preenchido (até ' + limite + ' caracteres).');
  }
  return valor.trim();
}

async function abrirChamado(db, dados) {
  const email = textoObrigatorio(dados.email, 'Autor', 320);
  const nome = textoObrigatorio(dados.categoria, 'Categoria', 120);
  const titulo = textoObrigatorio(dados.titulo, 'Título', 200);
  const descricao = textoObrigatorio(dados.descricao, 'Descrição');
  return db.chamado.create({
    data: {
      titulo,
      descricao,
      autor: { connect: { email } },
      categoria: { connect: { nome } },
      eventos: {
        create: { status: 'ABERTO', usuario: { connect: { email } } }
      }
    }
  });
}

async function resolverChamado(db, id, dados, simularFalha = false) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ErroDeAtendimento('Use um ID inteiro positivo.');
  }
  const email = textoObrigatorio(dados.email, 'Responsável', 320);
  const solucao = textoObrigatorio(dados.solucao, 'Solução');
  return db.$transaction(async tx => {
    const usuario = await tx.usuario.findUniqueOrThrow({ where: { email } });
    const alteracao = await tx.chamado.updateMany({
      where: { id, status: 'ABERTO' },
      data: { status: 'RESOLVIDO', solucao }
    });
    if (alteracao.count !== 1) {
      throw new ErroDeAtendimento('Chamado inexistente ou já resolvido.', 409);
    }
    if (simularFalha) {
      throw new ErroDeAtendimento(
        'Falha de demonstração após atualizar o chamado. Transação revertida.',
        409,
        'TRANSACAO_REVERTIDA'
      );
    }
    await tx.historicoStatus.create({
      data: { chamadoId: id, usuarioId: usuario.id, status: 'RESOLVIDO' }
    });
    return { id };
  }, { maxWait: 10000, timeout: 10000 });
}

module.exports = { abrirChamado, resolverChamado, ErroDeAtendimento };
