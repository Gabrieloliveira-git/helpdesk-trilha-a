# Helpdesk — Banco de Dados II
Um técnico recebe um chamado, pesquisa soluções anteriores da mesma categoria e registra a resolução. A aplicação roda no terminal. A trilha A usa Prisma para relacionamentos, migração e transações.

## Primeira execução no Windows
1. Extraia o ZIP inteiro. Abra a pasta helpdesk no Explorador, digite powershell na barra de endereço e pressione Enter. O terminal deve abrir na pasta que contém package.json.
2. Abra o Docker Desktop e aguarde o motor iniciar. Confira os pré-requisitos:
```powershell
node -v
npm.cmd -v
docker compose version
docker info
```
Use Node 22 a 24. Em docker info, procure a seção Server. Se a conexão falhar, aguarde o Docker Desktop e repita.
3. Na primeira execução, rode uma linha por vez. Espere cada uma terminar:
```powershell
Copy-Item .env.example .env
docker compose up -d --wait
docker compose ps
npm.cmd ci
npm.cmd run setup
npm.cmd run seed
npm.cmd run desk -- listar
```
O arquivo .env define a conexão local. O Compose baixa o PostgreSQL 16 e espera o banco aceitar conexões. O npm instala as versões do arquivo de lock. O setup gera o cliente Prisma e aplica a migração SQL versionada. O seed deve informar 5000 chamados de exemplo. Listar mostra nomes, e-mails e categorias para usar nos comandos.

## Ensaio no terminal
Rode a sequência abaixo. Quando solicitado, cole o número exibido por abrir. Cada chamada abre um processo novo e consulta os dados persistidos.
```powershell
npm.cmd run desk -- abrir ana@exemplo.test Rede "VPN pede senha em loop" "Troquei a senha e perdi acesso remoto."
$chamado = Read-Host "ID exibido por abrir"
npm.cmd run desk -- buscar Rede VPN
npm.cmd run desk -- falha $chamado bruno@exemplo.test "Credencial atualizada"
npm.cmd run desk -- ver $chamado
npm.cmd run desk -- resolver $chamado bruno@exemplo.test "Atualizei a credencial salva e testei o acesso."
npm.cmd run desk -- ver $chamado
```
A busca exibe até cinco casos resolvidos. A mensagem de erro do comando falha é esperada. Na primeira leitura, confira ABERTO, solução vazia e um evento. Na segunda, confira RESOLVIDO, solução preenchida e dois eventos. Tentar resolver novamente deve falhar e preservar o histórico.

## Encerrar e retomar
Use `docker compose down` para parar. Na próxima sessão, use `docker compose up -d --wait`. O volume guarda os registros. Para diagnóstico, use `docker compose logs banco`. Se a porta 55433 estiver ocupada, altere a porta à esquerda no Compose e na URL do .env para o mesmo número livre. Alterações no schema durante o desenvolvimento viram novas migrações com `npx.cmd prisma migrate dev --name nome_da_mudanca`.

## Entrega em dupla
Criem um repositório no GitHub, adicionem o colega como colaborador e enviem o projeto com README, código, schema, migração, lock e IA_LOG. O .gitignore protege .env e node_modules. Cada integrante deve fazer e testar uma contribuição real com sua própria conta. Por exemplo, um pode acrescentar uma categoria ao seed e o outro pode adaptar a consulta e demonstrar o efeito. Registrem essas mudanças no IA_LOG e façam commits descritivos. Antes da entrega, o colega deve clonar o repositório em outra pasta e seguir a primeira execução. Entrega prevista no enunciado: 10/11/2026.
