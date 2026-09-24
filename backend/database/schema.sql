-- nassauTickets — esquema MySQL 8.0
-- Executado por `npm run db:init` (cria as tabelas se não existirem).

CREATE TABLE IF NOT EXISTS counters (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL UNIQUE,
  active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  username       VARCHAR(50)  NOT NULL UNIQUE,
  password_hash  VARCHAR(100) NOT NULL,
  role           ENUM('ATENDENTE', 'GESTOR') NOT NULL DEFAULT 'ATENDENTE',
  active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sequência diária por tipo (RN02). Atualizada de forma atômica.
CREATE TABLE IF NOT EXISTS ticket_sequences (
  service_date  DATE    NOT NULL,
  type          CHAR(2) NOT NULL,
  last_seq      INT     NOT NULL,
  PRIMARY KEY (service_date, type)
) ENGINE=InnoDB;

-- Uma linha por dia: serve de trava (mutex) para "chamar próxima" e guarda o último tipo chamado (RN03/RN14).
CREATE TABLE IF NOT EXISTS call_control (
  service_date      DATE     NOT NULL PRIMARY KEY,
  last_called_type  CHAR(2)  NULL,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tickets (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  number          VARCHAR(12) NOT NULL UNIQUE,
  type            ENUM('SP', 'SG', 'SE') NOT NULL,
  sequence        SMALLINT    NOT NULL,
  service_date    DATE        NOT NULL,
  status          ENUM('EMITIDA', 'AGUARDANDO', 'CHAMADA', 'CHAMADA_NOVAMENTE',
                       'EM_ATENDIMENTO', 'ATENDIDA', 'NAO_COMPARECEU', 'DESCARTADA') NOT NULL,
  issued_at       DATETIME(3) NOT NULL,
  first_call_at   DATETIME(3) NULL,
  second_call_at  DATETIME(3) NULL,
  started_at      DATETIME(3) NULL,
  finished_at     DATETIME(3) NULL,
  closed_at       DATETIME(3) NULL,
  counter_id      INT NULL,
  user_id         INT NULL,
  CONSTRAINT fk_tickets_counter FOREIGN KEY (counter_id) REFERENCES counters (id),
  CONSTRAINT fk_tickets_user    FOREIGN KEY (user_id)    REFERENCES users (id),
  INDEX idx_tickets_queue   (service_date, status, type, sequence),
  INDEX idx_tickets_counter (counter_id, status),
  INDEX idx_tickets_calls   (service_date, first_call_at)
) ENGINE=InnoDB;

-- Trilha de auditoria: toda mudança de estado (RNF05).
CREATE TABLE IF NOT EXISTS ticket_events (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  ticket_id    INT         NOT NULL,
  from_status  VARCHAR(20) NULL,
  to_status    VARCHAR(20) NOT NULL,
  user_id      INT         NULL,
  counter_id   INT         NULL,
  created_at   DATETIME(3) NOT NULL,
  CONSTRAINT fk_events_ticket  FOREIGN KEY (ticket_id)  REFERENCES tickets (id),
  CONSTRAINT fk_events_user    FOREIGN KEY (user_id)    REFERENCES users (id),
  CONSTRAINT fk_events_counter FOREIGN KEY (counter_id) REFERENCES counters (id),
  INDEX idx_events_ticket (ticket_id)
) ENGINE=InnoDB;
