# Identidade visual — nassauTickets

## Logotipo

![Logotipo](logo.svg)

- `logo.svg`: logotipo completo (ícone + nome).
- `icone.svg`: ícone isolado, usado como favicon.

O ícone é um **ticket** (senha) com um pequeno marcador âmbar no centro, remetendo à fila de atendimento. O nome junta "nassau" (peso regular) e "**Tickets**" (negrito, na cor primária).

## Paleta de cores

| Uso | Cor | Hex |
|-----|-----|-----|
| Primária (marca, botões principais) | Teal | `#0b6e75` |
| Primária escura (textos da marca, painel) | Teal escuro | `#07494e` |
| Destaque (guichê no painel, "Última chamada") | Âmbar | `#f2a93b` |
| Senha **SP** — Prioritária | Laranja queimado | `#b83a0b` |
| Senha **SE** — Retirada de Exames | Violeta | `#6d28d9` |
| Senha **SG** — Geral | Azul | `#0a5f94` |
| Sucesso | Verde | `#15803d` |
| Erro / perigo | Vermelho | `#b91c1c` |
| Fundo | Cinza-azulado | `#f3f6f7` |
| Texto | Grafite | `#13262a` |

Cada tipo de senha tem uma cor fixa, usada no totem, no painel, na tela de atendimento e nos relatórios. Isso ajuda o cliente a reconhecer a própria senha. Todas as combinações de texto e fundo foram escolhidas para contraste mínimo de 4,5:1 (WCAG AA), e a cor nunca é o único indicador: o código SP/SE/SG sempre aparece escrito.

## Tipografia

Fonte do sistema (`Segoe UI`, `system-ui`, `Roboto`, `Arial`), sem download de fontes externas. Isso deixa o carregamento rápido e o funcionamento independente de internet nos quiosques.

| Elemento | Tamanho |
|----------|---------|
| Número da senha no painel | até 10rem (legível à distância) |
| Guichê no painel | até 4,5rem |
| Botões do totem | área mínima de 240px de altura |
| Texto base | 16px |

## Tom de voz

Mensagens curtas e diretas, na segunda pessoa ("Dirija-se ao Guichê 02", "Aguarde a chamada no painel"). Em caso de falha, sempre orientar a próxima ação ("dirija-se à recepção").
