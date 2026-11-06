const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const [acao,...args] = process.argv.slice(2);
const comandos = [
  'listar',
  'abrir EMAIL CATEGORIA TITULO DESCRICAO',
  'buscar CATEGORIA TERMO',
  'resolver ID EMAIL SOLUCAO',
  'falha ID EMAIL SOLUCAO',
  'ver ID'
];
function validar(n) {
  if (args.length !== n || args.some(a => !a.trim())) throw Error('Confira os argumentos: '+ comandos.join(' | '));
}
function idChamado() {
  const id = Number(args[0]);
  if (!Number.isSafeInteger(id) || id <= 0) throw Error('Use um ID inteiro positivo.');
  return id;
}
async function main() {
  switch (acao) {
    case 'listar':
      console.table(await db.usuario.findMany({select:{nome:true,email:true},orderBy:{id:'asc'}}));
      console.table(await db.categoria.findMany({select:{nome:true},orderBy:{nome:'asc'}}));
      break;
    case 'abrir': {
      validar(4);
      const [email,nome,titulo,descricao] = args;
      const chamado = await db.chamado.create({data:{titulo,descricao,
        autor:{connect:{email}}, categoria:{connect:{nome}},
        eventos:{create:{status:'ABERTO',usuario:{connect:{email}}}}}});
      console.log('Chamado aberto. ID:', chamado.id);
      break;
    }
    case 'buscar': {
      validar(2);
      const [categoria,termo] = args;
      const filtro = {contains:termo,mode:'insensitive'};
      console.table(await db.chamado.findMany({where:{
        categoria:{nome:categoria},status:'RESOLVIDO',OR:[{titulo:filtro},{descricao:filtro}]
      },select:{id:true,titulo:true,solucao:true},orderBy:{id:'desc'},take:5}));
      break;
    }
    case 'resolver':
    case 'falha': {
      validar(3);
      const id = idChamado();
      const [,email,solucao] = args;
      await db.$transaction(async tx => {
        const usuario = await tx.usuario.findUniqueOrThrow({where:{email}});
        const alteracao = await tx.chamado.updateMany({where:{id,status:'ABERTO'},data:{status:'RESOLVIDO',solucao}});
        if (alteracao.count !== 1) throw Error('Chamado inexistente ou já resolvido.');
        if (acao === 'falha') throw Error('Falha de demonstração após atualizar o chamado. Transação revertida.');
        await tx.historicoStatus.create({data:{chamadoId:id,usuarioId:usuario.id,status:'RESOLVIDO'}});
      });
      console.log('Resolução registrada.');
      break;
    }
    case 'ver':
      validar(1);
      console.dir(await db.chamado.findUniqueOrThrow({where:{id:idChamado()},include:{
        categoria:true,autor:true,eventos:{include:{usuario:true},orderBy:{id:'asc'}}
      }}),{depth:null});
      break;
    default: console.log(comandos.join('\n'));
  }
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
