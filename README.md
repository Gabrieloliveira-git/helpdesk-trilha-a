# Helpdesk — Banco de Dados II
Um técnico recebe um chamado, pesquisa soluções anteriores da mesma categoria e registra a resolução. A aplicação oferece terminal e interface web local. A trilha A usa Prisma para relacionamentos, migração e transações.

## Interface web local

Depois da preparação do banco descrita abaixo, execute:

```powershell
npm.cmd start
```

Abra http://localhost:3000 no navegador e mantenha esse terminal aberto. Para encerrar, pressione Ctrl+C.

O painel mostra totais reais do PostgreSQL, filtros, paginação, cadastro, detalhes, solução e histórico. A base de soluções começa filtrando os chamados resolvidos. O botão **Simular falha da transação** demonstra a reversão, consulta novamente o banco e exibe o estado resultante.

Para atualizar a cópia já preparada na pasta helpdesk-lucas, execute `git pull --ff-only origin main`, inicie o Docker Desktop, rode `docker compose up -d --wait` e `npm.cmd start`.

A API usa o servidor HTTP nativo do Node.js e escuta em 127.0.0.1. O navegador envia pedidos JSON à API, que usa Prisma. A conexão com o PostgreSQL é lida do .env. Nesta configuração, a porta da aplicação é 3000 e a do banco no Windows é 55433. A interface é destinada à demonstração local, com usuários fictícios selecionados nos formulários.

### Apresentação pela interface

1. Gabriel mostra o painel e abre um chamado em nome de Ana, na categoria Rede. Anota o ID e aponta o primeiro evento.
2. Lucas fecha os detalhes, abre **Base de soluções**, busca VPN e consulta uma solução anterior.
3. Em **Chamados**, localiza a ficha nova e abre seus detalhes. Seleciona Bruno como responsável e preenche a solução.
4. Clica em **Simular falha da transação**. Confere a mensagem de reversão, o estado em aberto e um evento.
5. Clica em **Resolver chamado**. Mostra a solução gravada e os dois eventos.
6. Busca a ficha na base de soluções. A dupla explica as relações no schema e a transação em src/chamados.js.

### Organização do código

- public/index.html, style.css e app.js compõem a interface.
- src/server.js atende as rotas da API e entrega os arquivos estáticos.
- src/chamados.js reúne as regras de abertura e resolução usadas pela API e pelo terminal.
- src/desk.js oferece os comandos do terminal.
- src/seed.js gera a massa fictícia.

As rotas GET /api/inicio, GET /api/chamados e GET /api/chamados/:id consultam o banco. As rotas POST /api/chamados, POST /api/chamados/:id/resolver e POST /api/chamados/:id/falha executam as operações de atendimento.

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
