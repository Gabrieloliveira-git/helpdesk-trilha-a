const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const casos = [
  ['Rede', 'VPN', 'O cliente de acesso remoto pede autenticação repetidamente após a troca de senha.', 'Atualizar a credencial salva e reconectar ao perfil corporativo.'],
  ['Impressão', 'Fila de impressão', 'Documentos ficam na fila mesmo com a impressora disponível na rede local.', 'Cancelar o trabalho travado e reenviar a página de teste.'],
  ['Acesso', 'Portal interno', 'O portal recusa o login de um usuário recém-transferido para outro setor.', 'Revisar a associação ao grupo de acesso do setor.'],
  ['Rede', 'Wi-Fi', 'O equipamento perde conexão ao mudar de sala durante uma reunião.', 'Reconfigurar o perfil da rede sem fio e testar a troca de sala.']
];
async function seed() {
  const autores = [];
  for (const nome of ['Ana','Bruno','Clara','Davi','Eva']) {
    const email = nome.toLowerCase() + '@exemplo.test';
    autores.push(await db.usuario.upsert({ where: {email}, update: {}, create: {nome,email} }));
  }
  const categorias = {};
  for (const nome of new Set(casos.map(c => c[0]))) {
    categorias[nome] = await db.categoria.upsert({where:{nome},update:{},create:{nome}});
  }
  for (let inicio = 0; inicio < 5000; inicio += 100) {
    await db.$transaction(async tx => {
      const dados = Array.from({length:100}, (_,j) => {
        const i = inicio+j;
        const [nome,tema,descricao,resposta] = casos[i % casos.length];
        const resolvido = i % 3 !== 0;
        return {codigoSeed:'S'+i,titulo:tema+' no posto '+(i+1),descricao,
          status:resolvido?'RESOLVIDO':'ABERTO',solucao:resolvido?resposta:null,
          autorId:autores[i % autores.length].id,categoriaId:categorias[nome].id};
      });
      const novos = await tx.chamado.createManyAndReturn({data:dados,skipDuplicates:true});
      const eventos = novos.flatMap(c => {
        const base = {chamadoId:c.id,usuarioId:c.autorId};
        const lista = [{...base,status:'ABERTO'}];
        if (c.status === 'RESOLVIDO') lista.push({...base,status:'RESOLVIDO'});
        return lista;
      });
      if (eventos.length) await tx.historicoStatus.createMany({data:eventos});
    }, {timeout:30000});
  }
  console.log('Chamados de exemplo:', await db.chamado.count({where:{codigoSeed:{not:null}}}));
}
seed().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
