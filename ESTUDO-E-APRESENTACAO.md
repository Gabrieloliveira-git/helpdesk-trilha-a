# Guia da dupla
## Aula prática de 30 minutos
**1. Olhem uma linha.** Um chamado é como uma ficha: título, descrição, autor, categoria e situação. O banco guarda inúmeras fichas em uma tabela. Duas pessoas podem ter o mesmo nome. Por isso cada usuário ganha um número único, a chave primária. No schema, procure @id.

**2. Sigam as ligações.** Desenhem Usuario (1) → (muitos) Chamado, Categoria (1) → (muitos) Chamado, Chamado (1) → (muitos) HistoricoStatus e Usuario (1) → (muitos) HistoricoStatus. A coluna autorId de um chamado aponta para Usuario.id. Esse vínculo recebe o nome de chave estrangeira. Se a categoria Rede mudar de nome, basta alterar uma linha de Categoria. Cada chamado continua apontando para o mesmo número. Essa separação evita repetir informações e é um exemplo de normalização.

**3. Acompanhem uma escrita.** Abram src/desk.js e procurem o bloco abrir. O connect localiza o autor por e-mail e a categoria por nome. O create aninhado grava também o primeiro evento. Experimentem uma categoria inexistente. Prevejam o resultado antes de executar: a referência exigida impede criar a ficha incompleta.

**4. Leiam a busca.** Em buscar, findMany pede vários chamados. O where combina três condições: categoria escolhida, status resolvido e presença do termo no título ou na descrição. A busca ignora diferenças de maiúsculas e minúsculas. O índice composto sobre categoriaId e status pode ajudar a restringir os candidatos. O trecho de texto ainda precisa ser comparado. Experimentem pesquisar VPN em Impressão e expliquem a lista vazia. Os 5.000 exemplos são fictícios e usam cenários repetidos para tornar a demonstração reproduzível.

**5. Façam uma previsão antes da falha.** Atualizar o chamado e registrar quem o resolveu são duas escritas. Em resolver, o Prisma agrupa as duas numa transação. O comando falha interrompe o processo entre elas. Usem ver para conferir que o banco desfez a primeira escrita. Depois resolvam de verdade. A condição status ABERTO na atualização impede resolver duas vezes.

**6. Entendam as ferramentas.** Docker inicia o serviço, PostgreSQL armazena as tabelas e Node executa os scripts. Prisma traduz as operações do código para o banco. O schema descreve o modelo desejado. A migração registra em SQL como construir essa estrutura. O seed insere exemplos em lotes; cada exemplo tem um código único para permitir repetir o script sem duplicá-lo.

## Apresentação sugerida — 6 minutos
| Tempo | Quem | Ação e fala de apoio |
|---|---|---|
| 0–1 min | Integrante 1 | “Um técnico precisa aproveitar a solução de um chamado antigo.” Mostre docker compose ps e identifique o banco. |
| 1–2 min | Integrante 1 | Mostre o schema e abra um chamado. Explique por que ele guarda a referência à categoria. Anote o ID. |
| 2–3 min | Integrante 2 | Busque Rede VPN. Leia uma solução e mostre por que um caso ainda aberto fica fora do resultado. |
| 3–5 min | Integrante 2 | Execute falha e ver. Peça à turma que preveja o status. Depois execute resolver e ver. Compare os eventos. |
| 5–6 min | Ambos | Mostrem uma adaptação que realmente fizeram e expliquem como testaram. |

## Perguntas para ensaio sem consultar o código
- Onde ficam os dados depois que o script termina? No PostgreSQL. O volume mantém os arquivos quando o contêiner é recriado.
- Quem abriu e quem resolveu? O chamado referencia o autor. O evento referencia o usuário que executou a mudança.
- Como provar que a transação funcionou? Comparar status, solução e quantidade de eventos após a falha e após o sucesso.
- A busca entende sinônimos? Ela compara o texto digitado com título e descrição. Um sinônimo só aparece se estiver no texto.
- Como outro computador reproduz o projeto? Compose sobe o banco, o lock fixa dependências, a migração cria tabelas e o seed gera exemplos.
- Por que usar Prisma? Mostrem no código uma ligação entre tabelas, a migração versionada e a operação que exige transação.

Troquem os papéis no segundo ensaio. Cada integrante deve conseguir explicar uma decisão, executar um comando e interpretar o resultado sozinho.
