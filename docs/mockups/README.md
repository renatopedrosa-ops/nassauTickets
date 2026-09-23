# Mockups e protótipos — nassauTickets

As telas abaixo foram capturadas do protótipo funcional (frontend React rodando com o backend e dados simulados).

| # | Tela | Agente | Arquivo |
|---|------|--------|---------|
| 1 | Página inicial | — | ![Início](01-inicio.png) |
| 2 | Totem: escolha do tipo de senha | Cliente | ![Totem](02-totem.png) |
| 3 | Totem: senha emitida | Cliente | ![Senha emitida](03-totem-senha-emitida.png) |
| 4 | Atendimento após o login | Atendente | ![Login](04-login-ok.png) |
| 5 | Atendimento: senha chamada novamente | Atendente | ![Atendimento](05-atendimento.png) |
| 6 | Painel de chamadas (5 últimas) | Sistema | ![Painel](06-painel.png) |
| 7 | Relatório diário: resumo | Gestor | ![Relatório diário](07-relatorio-diario.png) |
| 8 | Relatório de auditoria | Gestor | ![Auditoria](08-relatorio-auditoria.png) |
| 9 | Relatório mensal | Gestor | ![Relatório mensal](09-relatorio-mensal.png) |
| 10 | Cadastro de atendentes | Gestor | ![Atendentes](10-cadastro-atendentes.png) |
| 11 | Operações: simular dia e encerrar expediente | Gestor | ![Operações](11-operacoes.png) |
| 12 | Totem em tela de celular (responsivo) | Cliente | ![Totem celular](12-totem-celular.png) |
| 13 | Painel com o backend fora do ar | Sistema | ![Painel sem conexão](13-painel-sem-conexao.png) |
| 14 | Totem com o backend fora do ar | Cliente | ![Totem sem conexão](14-totem-sem-conexao.png) |

## Fluxo de navegação

```mermaid
flowchart LR
    Inicio[Início] --> Totem
    Inicio --> Painel
    Inicio --> Login
    Login -->|atendente com guichê| Atendimento
    Login -->|gestor sem guichê| Gestao[Gestão]
    Gestao --> Relatorios[Relatórios: resumo, detalhado, auditoria]
    Gestao --> Atendentes
    Gestao --> Guiches[Guichês]
    Gestao --> Operacoes[Operações]
```
