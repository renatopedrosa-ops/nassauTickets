# Requisitos — nassauTickets

Sistema de Controle de Atendimento por senhas de um Laboratório de Análises Clínicas.

## 1. Agentes

| Sigla | Agente           | Responsabilidade                                                                                       |
|-------|------------------|--------------------------------------------------------------------------------------------------------|
| AS    | Agente Sistema   | Executa as ações do sistema, persiste dados, emite senhas, atualiza o painel e responde aos comandos. |
| AA    | Agente Atendente | Faz login, chama a próxima senha, rechama, inicia e finaliza o atendimento no guichê.                 |
| AC    | Agente Cliente   | Emite a senha no totem (de forma anônima) e acompanha a chamada no painel.                            |

## 2. Tipos de senha

| Código | Nome                        | Prioridade          |
|--------|-----------------------------|---------------------|
| SP     | Senha Prioritária           | Maior               |
| SE     | Senha de Retirada de Exames | Operacional especial (logo após uma SP) |
| SG     | Senha Geral                 | Menor               |

## 3. Requisitos Funcionais (RF)

| ID    | Requisito                                                                                                          | Agente |
|-------|--------------------------------------------------------------------------------------------------------------------|--------|
| RF01  | O cliente deve emitir uma senha SP, SG ou SE no totem, sem se identificar.                                          | AC     |
| RF02  | O sistema deve gerar o número da senha no padrão `YYMMDD-PPSQ`.                                                     | AS     |
| RF03  | O sistema deve manter a fila de senhas aguardando, separada por tipo e em ordem de emissão (FIFO).                  | AS     |
| RF04  | O atendente deve fazer login informando usuário, senha e guichê.                                                    | AA     |
| RF05  | O atendente deve chamar a próxima senha; o sistema escolhe a senha seguindo as regras de prioridade (RN03).         | AA/AS  |
| RF06  | O atendente deve poder chamar novamente a senha atual ("Última chamada").                                           | AA     |
| RF07  | O atendente deve iniciar o atendimento da senha chamada.                                                            | AA     |
| RF08  | O atendente deve finalizar o atendimento iniciado.                                                                  | AA     |
| RF09  | O atendente deve registrar o não comparecimento de uma senha após a segunda chamada.                                | AA     |
| RF10  | O painel deve exibir as 5 últimas senhas chamadas, com tipo e guichê, sem exibir a próxima senha da fila.           | AS     |
| RF11  | O painel deve anunciar por áudio o tipo, o número da senha e o guichê a cada chamada; na rechamada, "Última chamada". | AS     |
| RF12  | O gestor deve cadastrar, editar e desativar atendentes.                                                             | AA (gestor) |
| RF13  | O gestor deve cadastrar, editar e desativar guichês.                                                                | AA (gestor) |
| RF14  | O gestor deve emitir relatórios diário e mensal (ver seção 6).                                                      | AA (gestor) |
| RF15  | O sistema deve descartar, ao final do expediente, as senhas que permanecerem na fila.                               | AS     |
| RF16  | O sistema deve registrar em trilha de auditoria cada mudança de estado das senhas (quem, onde e quando).            | AS     |
| RF17  | O sistema deve permitir simular um dia de atendimento para demonstração dos relatórios (tempos médios e 5% de não comparecimento). | AS |

## 4. Regras de Negócio (RN)

| ID   | Regra |
|------|-------|
| RN01 | O expediente ocorre das **07h às 17h**. Fora desse horário o totem não emite senhas e não há novas chamadas. |
| RN02 | Numeração `YYMMDD-PPSQ`: `YY` ano (2 dígitos), `MM` mês, `DD` dia, `PP` tipo (SP/SG/SE), `SQ` sequência de 3 dígitos **por tipo**, reiniciada diariamente. Ex.: `260923-SP001`. |
| RN03 | Ordem de chamada intercalada `[SP] → [SE\|SG] → [SP] → [SE\|SG] ...`. Se a última senha chamada foi SP, a próxima é SE; se não houver SE, SG; se não houver nenhuma das duas, SP. Se a última chamada não foi SP (ou é a primeira do dia), a próxima é SP; se não houver SP, SE; e, por fim, SG. Dentro do mesmo tipo vale a ordem de emissão. |
| RN04 | Qualquer guichê pode atender qualquer tipo de senha. |
| RN05 | Se uma fila estiver vazia, o sistema escolhe o próximo tipo disponível respeitando a RN03. |
| RN06 | Uma senha que não for atendida após **duas chamadas** (chamada + chamada novamente) é considerada abandonada (`NAO_COMPARECEU`). |
| RN07 | Uma senha só pode ser rechamada uma vez. |
| RN08 | Um guichê só pode ter uma senha ativa por vez (chamada ou em atendimento). |
| RN09 | Atendimentos iniciados devem ser finalizados pelo atendente, mesmo após as 17h. |
| RN10 | Ao final do expediente, as senhas que ainda estão em `AGUARDANDO` passam para `DESCARTADA`. Senhas de dias anteriores que ficaram na fila também são descartadas. |
| RN11 | Na simulação, aproximadamente **5% das senhas emitidas** não são atendidas (não comparecimento). Tempos médios de atendimento (TM): SP = 15 min ± 5 min; SG = 5 min ± 3 min; SE = 1 min em 95% dos casos e 5 min em 5% dos casos. |
| RN12 | O cliente é anônimo: nenhum dado pessoal é coletado no totem. |
| RN13 | Existe o perfil **Atendente** e o perfil adicional **Gestor**, que também pode atender. Apenas o gestor acessa cadastros e relatórios. |
| RN14 | Duas ou mais solicitações simultâneas de "chamar próxima" nunca podem receber a mesma senha. |

## 5. Máquina de estados da senha

```
EMITIDA → AGUARDANDO → CHAMADA → CHAMADA_NOVAMENTE → EM_ATENDIMENTO → ATENDIDA
                          │              │
                          └──────────────┴──→ EM_ATENDIMENTO (cliente compareceu)
                                         └──→ NAO_COMPARECEU (após a 2ª chamada)
AGUARDANDO → DESCARTADA (fim do expediente)
```

| Estado            | Descrição |
|-------------------|-----------|
| EMITIDA           | Senha gerada pelo totem. |
| AGUARDANDO        | Senha na fila, aguardando chamada. |
| CHAMADA           | Senha chamada pela primeira vez em um guichê. |
| CHAMADA_NOVAMENTE | Senha rechamada ("Última chamada"). |
| EM_ATENDIMENTO    | Cliente compareceu e o atendimento foi iniciado. |
| ATENDIDA          | Atendimento finalizado (estado final). |
| NAO_COMPARECEU    | Cliente não compareceu após duas chamadas (estado final). |
| DESCARTADA        | Senha que ficou na fila ao final do expediente (estado final, extensão da especificação). |

## 6. Relatórios (diário e mensal)

- Quantitativo geral de senhas emitidas.
- Quantitativo geral de senhas atendidas.
- Quantitativo de senhas emitidas por prioridade.
- Quantitativo de senhas atendidas por prioridade.
- Relatório detalhado: número, tipo, data/hora de emissão, data/hora de atendimento e guichê. Senhas não atendidas ficam com os campos de atendimento em branco.
- Tempo médio de atendimento (geral e por tipo).
- Relatório de auditoria: atendente, guichê, senha, 1ª chamada, 2ª chamada (se houver), início e fim do atendimento.

### Proposta de indicadores de desempenho

| Indicador                     | Fórmula |
|-------------------------------|---------|
| TMA (tempo médio de atendimento) | média de (fim − início do atendimento) |
| TME (tempo médio de espera)   | média de (1ª chamada − emissão) |
| Taxa de abandono              | não compareceu ÷ emitidas |
| Taxa de descarte              | descartadas ÷ emitidas |
| Produtividade por guichê      | atendidas por guichê e TMA do guichê |

## 7. Requisitos Não Funcionais (RNF)

| ID    | Categoria       | Requisito |
|-------|-----------------|-----------|
| RNF01 | Tecnologia      | Frontend em React 19; backend em Node.js 22 LTS com Express; banco MySQL 8.0. |
| RNF02 | Segurança       | Senhas de usuários armazenadas com hash bcrypt; autenticação por JWT com expiração; rotas administrativas restritas ao perfil gestor; consultas SQL parametrizadas (contra SQL injection); CORS configurável. |
| RNF03 | Concorrência    | A escolha da próxima senha ocorre em transação com bloqueio pessimista (`SELECT ... FOR UPDATE`), garantindo que dois guichês nunca recebam a mesma senha (RN14). A sequência diária é gerada de forma atômica. |
| RNF04 | Disponibilidade | O painel e as telas continuam exibindo os últimos dados conhecidos se o backend ou o banco falharem, mostram um aviso de "sem conexão" e tentam reconectar sozinhos. O endpoint `/api/health` informa o estado do backend e do banco. |
| RNF05 | Auditoria       | Toda transição de estado é registrada em `ticket_events` com data/hora, usuário e guichê. Os registros não são apagados pela aplicação. |
| RNF06 | Desempenho      | Chamar a próxima senha deve responder em menos de 500 ms; o painel se atualiza a cada 2 segundos; índices em `(service_date, status, type)`. |
| RNF07 | LGPD            | O cliente é anônimo (princípio da minimização, art. 6º, III): o sistema não coleta nome, CPF ou qualquer dado pessoal do cliente. Dados de atendentes limitam-se ao necessário para autenticação e auditoria. |
| RNF08 | Acessibilidade  | Anúncio por voz (Web Speech API, pt-BR), região `aria-live` no painel, alto contraste, fontes grandes, botões grandes no totem e navegação por teclado. |
| RNF09 | Usabilidade     | O totem emite a senha com um único toque. |
| RNF10 | Portabilidade   | O frontend roda com `npm run dev` a partir de `frontend/`; o backend roda com `npm run dev` a partir de `backend/`. |
