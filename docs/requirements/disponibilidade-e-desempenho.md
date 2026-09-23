# Disponibilidade, recuperação de falhas e desempenho

Este documento responde aos desafios do laboratório sobre falhas do backend ou do banco, concorrência e acompanhamento de desempenho.

## 1. Comportamento diante de falhas (recuperação de desastres)

| Cenário | Backend | Painel | Totem | Atendimento |
|---------|---------|--------|-------|-------------|
| Backend fora do ar | — | Mantém as últimas 5 chamadas na tela, exibe a faixa "Sem conexão com o servidor… exibindo dados de HH:MM:SS" e tenta reconectar com intervalo crescente (2 s → 4 s → 8 s → até 15 s). | Mostra "Sistema temporariamente indisponível. Por favor, dirija-se à recepção." | Mantém a senha atual na tela, desabilita os botões de ação e exibe o aviso de conexão. |
| Banco de dados fora do ar | Responde **HTTP 503** (`BANCO_INDISPONIVEL`) sem derrubar o processo. `/api/health` informa `database: "indisponivel"`. | Igual ao cenário anterior. | Igual ao cenário anterior. | Igual ao cenário anterior. |
| Falha no meio de uma operação | A transação sofre *rollback*: nenhuma senha fica "meio chamada". | — | — | O botão pode ser clicado de novo com segurança. |
| Deadlock no banco | A transação é repetida automaticamente (até 3 vezes). | — | — | — |
| Retorno do serviço | — | Volta sozinho a atualizar, sem recarregar a página. | Volta a emitir. | Volta a habilitar os botões. |

### Plano de contingência operacional (recomendação ao laboratório)

1. **Banco:** backup diário completo (`mysqldump --single-transaction`) e *binary logs* ativados, para recuperação até o ponto da falha. Réplica de leitura opcional.
2. **Backend sem estado:** a API não guarda sessão em memória (usa JWT), então várias instâncias podem rodar atrás de um balanceador. Um *process manager* (PM2 ou systemd) reinicia o processo em caso de queda.
3. **Contingência manual:** manter senhas de papel pré-numeradas por tipo na recepção, para uso enquanto o sistema estiver indisponível.
4. **Monitoramento:** consultar `/api/health` a cada minuto e alertar a TI se houver falha.

## 2. Concorrência

- **Chamar próxima:** trava pessimista na linha do dia (`call_control ... FOR UPDATE`). Chamadas simultâneas são serializadas e cada guichê recebe uma senha diferente, mantendo a intercalação SP → SE|SG. Isso é testado automaticamente com 10 guichês chamando ao mesmo tempo (`backend/tests/attendance.test.js`).
- **Emitir senha:** sequência diária gerada com `INSERT ... ON DUPLICATE KEY UPDATE`, que é atômico. Também é testada com 20 emissões simultâneas.
- **Mesmo guichê em duas abas:** a senha ativa do guichê é travada (`FOR UPDATE`) antes de qualquer mudança de estado, e a máquina de estados recusa transições inválidas (HTTP 409).

## 3. Proposta para quantificar e acompanhar o desempenho

Indicadores disponíveis nos relatórios diário e mensal:

| Indicador | Como é calculado | Uso |
|-----------|------------------|-----|
| **TMA** — tempo médio de atendimento (geral e por tipo) | média de `finished_at − started_at` das senhas ATENDIDAS | Comparar com o TM de referência (SP 15 min, SG 5 min, SE < 2 min). |
| **TME** — tempo médio de espera (geral e por tipo) | média de `first_call_at − issued_at` | Qualidade percebida pelo cliente. |
| **Taxa de atendimento** | atendidas ÷ emitidas | Eficiência geral. |
| **Taxa de não comparecimento** | não compareceu ÷ emitidas | Referência histórica: cerca de 5%. |
| **Taxa de descarte** | descartadas ÷ emitidas | Indica falta de guichês no fim do dia. |
| **Produtividade por guichê** | atendidas e TMA por guichê | Balancear a equipe. |
| **Emissões por hora** | contagem por hora de emissão | Identificar horários de pico e dimensionar guichês. |

**Metas sugeridas:** TME abaixo de 15 minutos, taxa de descarte igual a 0 e TMA dentro de ±20% do TM de referência. A auditoria permite investigar desvios senha a senha.

## 4. Metas de desempenho técnico

- Chamar próxima e emitir senha abaixo de 500 ms (consultas indexadas por `service_date, status, type, sequence`).
- Painel atualizado a cada 2 s com uma consulta leve (`LIMIT 5`).
- Relatórios mensais calculados em uma única consulta por período.
