const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const { abrirChamado, resolverChamado } = require('./chamados');
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
      const chamado = await abrirChamado(db, {email,categoria:nome,titulo,descricao});
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
      await resolverChamado(db, id, {email,solucao}, acao === 'falha');
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
