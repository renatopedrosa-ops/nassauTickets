# Planejamento por etapas (Sprints) — nassauTickets

O projeto foi organizado em etapas curtas (sprints), seguindo o Scrum. Cada etapa tem um objetivo, as entregas e onde elas estão no repositório. As datas são as dos commits registrados no GitHub.

## Equipe e papéis

| Membro | Papel | Responsabilidade principal |
|--------|-------|----------------------------|
| Renato Pedrosa Maranhão | Scrum Master | Criar e organizar o repositório, conduzir as etapas, integrar a `dev` na `main` |
| Túlio Barbosa de Souza | Desenvolvedor e Testador | Evoluir o código e validar as funcionalidades e regras de negócio |
| Carlos Eduardo Vieira de Carvalho | Desenvolvedor e Documentador | Evoluir o código e manter a documentação organizada e atualizada |

## Visão geral das etapas

| Etapa | Objetivo | Situação |
|-------|----------|----------|
| Sprint 0 | Estrutura do repositório | ✅ Concluída (23/09) |
| Sprint 1 | Requisitos e regras de negócio | ✅ Concluída (23/09) |
| Sprint 2 | Backend: API, banco e regras | ✅ Concluída (23/09) |
| Sprint 3 | Frontend React | ✅ Concluída (23/09) |
| Sprint 4 | Documentação técnica (MER, UML, mockups, identidade visual) | ✅ Concluída (23/09) |
| Sprint 5 | Correções de compatibilidade (Windows e XAMPP) | ✅ Concluída (24/09) |
| Sprint 6 | Equipe, validação e apresentação | 🔄 Em andamento |

## Sprint 0 — Estrutura do repositório
**Objetivo:** deixar o repositório no formato exigido pela atividade.

- Repositório público com licença MIT, `.gitignore` para Node.js e `README.md`.
- Estrutura obrigatória (`backend/`, `docs/`, `frontend/`) com `.gitkeep` nas pastas vazias.
- Branches `main` e `dev`.

## Sprint 1 — Requisitos e regras de negócio
**Objetivo:** transformar a especificação do laboratório em requisitos numerados.

- 17 requisitos funcionais, 14 regras de negócio e 12 requisitos não funcionais.
- Máquina de estados da senha e definição dos relatórios.
- Entrega: [`requisitos.md`](requisitos.md).

## Sprint 2 — Backend
**Objetivo:** API REST com as regras de atendimento.

- Banco MySQL 8.0, numeração `YYMMDD-PPSQ` e regra de prioridade `[SP] → [SE|SG]`.
- Emissão, fila, chamada, rechamada, início e fim de atendimento.
- Controle de concorrência, login com JWT, cadastros, relatórios e encerramento do expediente.
- Testes automáticos das regras de negócio.
- Entrega: pasta [`backend/`](../../backend).

## Sprint 3 — Frontend
**Objetivo:** telas em React consumindo a API.

- Totem, painel de chamadas com áudio, tela de atendimento, login e área do gestor.
- Comportamento do painel e do totem quando o servidor falha.
- Entrega: pasta [`frontend/`](../../frontend).

## Sprint 4 — Documentação técnica
**Objetivo:** documentar o sistema para outras pessoas entenderem e executarem.

- MER, casos de uso, diagramas UML, mockups, identidade visual e README completo.
- Entrega: pasta [`docs/`](..) e [`README.md`](../../README.md).

## Sprint 5 — Correções de compatibilidade
**Objetivo:** fazer o projeto rodar nos computadores da equipe.

- Compatibilidade com o MariaDB do XAMPP.
- Correção do `npm run db:init` no Windows.
- Orientações no README sobre XAMPP e sobre não abrir o `index.html` direto no navegador.

## Sprint 6 — Equipe, validação e apresentação (em andamento)
**Objetivo:** distribuir as tarefas finais entre os membros e preparar a entrega.

| Tarefa | Responsável | Situação |
|--------|-------------|----------|
| Definir papéis e atualizar a seção Membros do README | Renato | ✅ Concluída (01/10) |
| Instalar o projeto seguindo o README e rodar `npm test` no backend | Túlio | ⬜ A fazer |
| Testar no navegador o fluxo totem → atendimento → painel e registrar o resultado | Túlio | ⬜ A fazer |
| Revisar os textos de `docs/requirements` e do README | Carlos | ⬜ A fazer |
| Revisar os diagramas de `docs/models/uml` e do MER | Carlos | ⬜ A fazer |
| Integrar a `dev` na `main` ao final da sprint | Renato | ⬜ A fazer |
| Ensaiar a apresentação e a demonstração ao vivo | Todos | ⬜ A fazer |

**Regra da equipe:** todo trabalho é enviado primeiro para a branch `dev`, com commits pequenos e mensagens no padrão `tipo: descrição` (`feat:`, `fix:`, `docs:`, `test:`). O Scrum Master integra a `dev` na `main` por merge ao final de cada etapa.
