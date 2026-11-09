# Registro do uso de IA

## 06/11/2026 — elaboração assistida

Solicitação inicial da dupla: “pode nos ajudar no desenvolvimento, entrega, apresentação e estudo do mesmo?”
Orientação seguinte: “Podemos usar a trilha A, porém temos uma noção básica/0 sobre o assunto, você vai ter que esmiuçar bem pra gente. E também, a ideia já é deixar tudo feito hoje, se possível”.

A IA elaborou a base do Helpdesk: Compose, modelo relacional, migração gerada com Prisma, scripts de população e consulta, demonstração de transação e material de estudo. O exemplo de VPN foi escolhido para ligar os passos da apresentação.

## Registro pela dupla

Ao trabalhar no projeto, acrescentem uma entrada por alteração efetivamente realizada:

* Data e integrante:
* Prompt utilizado, se houver:
* Arquivo e adaptação manual:
* Por que fizemos essa mudança:
* Comando executado e resultado observado:
* Commit correspondente:
* 

\## 09/11/2026 — Instalação e teste por Lucas



Clonei o repositório na pasta helpdesk-lucas e configurei minha

identidade local no Git.



Adaptei a instalação para usar a porta 55433, permitindo executar

um banco separado na mesma máquina. Atualizei docker-compose.yml,

.env.example e README.md para documentar essa configuração.



Durante a instalação, ocorreu o erro P1001. Conferi a saída de

docker compose ps e identifiquei o encaminhamento 55433->5433.

Corrigi o destino para a porta 5432 do PostgreSQL e recriei o

contêiner com docker compose up -d --wait.



Após a correção, npm run setup concluiu a preparação.

npm run seed informou 5000 chamados de exemplo.

npm run desk -- buscar Rede VPN retornou chamados com soluções.



Usei a IA para orientar o diagnóstico da conexão, a correção da

porta e o registro deste teste.

