# Diagramas UML — nassauTickets

## 1. Diagrama de estados da senha

```mermaid
stateDiagram-v2
    [*] --> EMITIDA : cliente emite no totem
    EMITIDA --> AGUARDANDO : entra na fila
    AGUARDANDO --> CHAMADA : atendente chama próxima
    AGUARDANDO --> DESCARTADA : fim do expediente (17h)
    CHAMADA --> CHAMADA_NOVAMENTE : chamar novamente
    CHAMADA --> EM_ATENDIMENTO : cliente compareceu
    CHAMADA --> NAO_COMPARECEU : encerramento de dia anterior
    CHAMADA_NOVAMENTE --> EM_ATENDIMENTO : cliente compareceu
    CHAMADA_NOVAMENTE --> NAO_COMPARECEU : 2 chamadas sem comparecimento
    EM_ATENDIMENTO --> ATENDIDA : atendente finaliza
    ATENDIDA --> [*]
    NAO_COMPARECEU --> [*]
    DESCARTADA --> [*]
```

As transições permitidas ficam centralizadas em `backend/src/domain/ticketStateMachine.js`. Qualquer outra transição é recusada com HTTP 409.

## 2. Diagrama de classes (domínio e serviços)

```mermaid
classDiagram
    direction LR

    class Ticket {
        +int id
        +string number
        +TicketType type
        +int sequence
        +Date serviceDate
        +TicketStatus status
        +DateTime issuedAt
        +DateTime firstCallAt
        +DateTime secondCallAt
        +DateTime startedAt
        +DateTime finishedAt
        +DateTime closedAt
    }
    class User {
        +int id
        +string name
        +string username
        +string passwordHash
        +Role role
        +bool active
    }
    class Counter {
        +int id
        +string name
        +bool active
    }
    class TicketEvent {
        +int id
        +TicketStatus fromStatus
        +TicketStatus toStatus
        +DateTime createdAt
    }
    class TicketType {
        <<enumeration>>
        SP
        SE
        SG
    }
    class TicketStatus {
        <<enumeration>>
        EMITIDA
        AGUARDANDO
        CHAMADA
        CHAMADA_NOVAMENTE
        EM_ATENDIMENTO
        ATENDIDA
        NAO_COMPARECEU
        DESCARTADA
    }
    class Role {
        <<enumeration>>
        ATENDENTE
        GESTOR
    }

    class TicketService {
        +issue(type) Ticket
        +callNext(userId, counterId)
        +recall(userId, counterId) Ticket
        +start(userId, counterId) Ticket
        +finish(userId, counterId) Ticket
        +noShow(userId, counterId) Ticket
        +panel() Call[]
        +queueSummary()
    }
    class ReportService {
        +daily(date) Report
        +monthly(month) Report
    }
    class DayCloseService {
        +closeStaleTickets(now)
    }
    class SimulationService {
        +simulateDay(date, total)
    }
    class AuthService {
        +login(username, password, counterId)
        +verify(token)
    }
    class TicketRepository {
        +nextSequence(date, type)
        +lockCallControl(date)
        +pickNextWaiting(date, order)
        +findActiveByCounter(counterId)
        +listForReport(from, to)
    }

    Ticket "*" --> "0..1" Counter : chamada em
    Ticket "*" --> "0..1" User : chamada por
    Ticket "1" *-- "1..*" TicketEvent : histórico
    Ticket --> TicketType
    Ticket --> TicketStatus
    User --> Role
    TicketService ..> TicketRepository
    ReportService ..> TicketRepository
    DayCloseService ..> TicketService
    SimulationService ..> TicketRepository
```

## 3. Sequência — emitir senha (UC01)

```mermaid
sequenceDiagram
    actor AC as Cliente
    participant T as Totem (React)
    participant API as API Express
    participant S as TicketService
    participant DB as MySQL

    AC->>T: escolhe "SG"
    T->>API: POST /api/tickets {type: "SG"}
    API->>S: issue("SG")
    S->>S: verifica expediente (7h–17h)
    S->>DB: BEGIN
    S->>DB: INSERT ... ON DUPLICATE KEY UPDATE last_seq = last_seq + 1
    DB-->>S: sequência 12
    S->>DB: INSERT tickets (260923-SG012, EMITIDA)
    S->>DB: INSERT ticket_events (EMITIDA) e UPDATE para AGUARDANDO
    S->>DB: COMMIT
    S-->>API: senha
    API-->>T: 201 Created
    T-->>AC: exibe "SG012"
```

## 4. Sequência — dois atendentes chamam ao mesmo tempo (concorrência)

```mermaid
sequenceDiagram
    participant A1 as Atendente Guichê 01
    participant A2 as Atendente Guichê 02
    participant API as API
    participant DB as MySQL (InnoDB)

    par quase simultâneo
        A1->>API: POST /attendance/call-next
    and
        A2->>API: POST /attendance/call-next
    end
    API->>DB: [T1] SELECT ... FROM call_control FOR UPDATE
    Note over DB: T1 obtém a trava do dia
    API->>DB: [T2] SELECT ... FROM call_control FOR UPDATE
    Note over DB: T2 fica esperando
    API->>DB: [T1] escolhe SP001 → CHAMADA, last_called_type = SP
    API->>DB: [T1] COMMIT (libera a trava)
    DB-->>API: T2 prossegue e lê last_called_type = SP
    API->>DB: [T2] escolhe SE001 → CHAMADA (intercalação mantida)
    API->>DB: [T2] COMMIT
    API-->>A1: SP001
    API-->>A2: SE001
```

A trava do dia é sempre a **primeira** a ser obtida. Essa ordem única de travas, junto com o isolamento `READ COMMITTED`, evita deadlocks. Se o MySQL ainda assim acusar um deadlock, a transação é repetida automaticamente (até 3 tentativas).

## 5. Sequência — chamar novamente e não comparecimento

```mermaid
sequenceDiagram
    actor AA as Atendente
    participant UI as Tela de atendimento
    participant API as API
    participant P as Painel

    AA->>UI: Chamar próxima
    UI->>API: POST /call-next
    API-->>UI: SG004 (CHAMADA)
    P->>API: GET /panel (a cada 2 s)
    P-->>P: 🔊 "Senha geral, S G 0 0 4. Dirija-se ao Guichê 01"
    AA->>UI: Chamar novamente
    UI->>API: POST /recall
    API-->>UI: CHAMADA_NOVAMENTE
    P-->>P: 🔊 "Última chamada. Senha geral, S G 0 0 4..."
    alt cliente comparece
        AA->>UI: Iniciar atendimento → Finalizar
    else cliente não comparece
        AA->>UI: Não compareceu (ou Chamar próxima)
        UI->>API: POST /no-show
        API-->>UI: NAO_COMPARECEU
    end
```

## 6. Diagrama de componentes (arquitetura)

```mermaid
flowchart LR
    subgraph Navegador
        TOTEM[Totem]
        PAINEL[Painel]
        ATD[Atendimento]
        GEST[Gestão]
    end
    subgraph Frontend["frontend/ (React 19 + Vite)"]
        PAGES[pages/] --> COMP[components/]
        PAGES --> HOOKS["hooks/ (usePolling, useSpeech)"]
        PAGES --> SERV["services/ (api.js, nassauApi.js)"]
    end
    subgraph Backend["backend/ (Node 22 + Express 5)"]
        ROUTES[routes/] --> MW["middlewares/ (auth, erros)"]
        ROUTES --> SVC[services/]
        SVC --> DOM["domain/ (regras e estados)"]
        SVC --> REPO[repositories/]
    end
    DB[(MySQL 8.0)]

    TOTEM & PAINEL & ATD & GEST --> PAGES
    SERV -- "HTTP/JSON (REST)" --> ROUTES
    REPO -- "mysql2 (SQL parametrizado)" --> DB
```
