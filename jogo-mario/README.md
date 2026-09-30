# Jogo Mario

Jogo de plataforma no estilo Super Mario feito com **HTML5 Canvas + CSS + JavaScript puro** (sem bibliotecas, sem imagens: todos os gráficos e sons são gerados por código).

## Como jogar

Abra `index.html` no navegador (duplo clique já funciona) ou sirva a pasta:

```bash
cd jogo-mario
python3 -m http.server 8080   # depois acesse http://localhost:8080
```

| Ação | Teclado | Celular |
|------|---------|---------|
| Mover | ← → ou A D | ◀ ▶ |
| Pular (segure para ir mais alto) | Espaço, ↑, W ou Z | A |
| Correr | Shift ou X | B |
| Iniciar / pausar | Enter | toque na tela |

## Funcionalidades

- Fase 1-1 completa: canos, blocos `?`, tijolos, escadas, buracos, bandeira e castelo
- Física com aceleração, atrito, corrida e pulo variável
- Inimigos (Goombas): pise para derrotar, ou bata no bloco embaixo deles
- Cogumelo que faz o Mario crescer; grande, ele quebra tijolos
- Moedas, pontuação, vidas (100 moedas = 1 vida), cronômetro e bônus de tempo
- Efeitos sonoros sintetizados com WebAudio
- Layout responsivo com controles de toque no celular
- Loop de jogo com passo fixo de 60 FPS

## Arquivos

- `index.html` — estrutura da página, canvas e botões de toque
- `style.css` — visual da página e controles mobile
- `game.js` — motor do jogo (fase, física, colisões, inimigos, desenho, HUD)

> Projeto de fã, sem fins lucrativos. Mario é marca registrada da Nintendo.
