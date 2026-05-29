# OH o Carro do Ovo (POC)

Esta é uma POC (Proof of Concept) de um sistema de rastreamento em tempo real simulando o trajeto de um "carro do ovo" e notificando múltiplos clientes na rota.

## Arquitetura

O sistema é construído com simplicidade e eficiência:

*   **Backend (Go)**: Um servidor web `net/http` que faz a simulação do deslocamento do veículo. A rota real é buscada dinamicamente através da API do **OSRM** (Open Source Routing Machine). A comunicação com a UI é feita via SSE (**Server-Sent Events**).
*   **Frontend (HTML/JS/CSS)**: Escrito em Vanilla JS, sem frameworks pesados, para manter a leveza. Utiliza o mapa interativo através do **Leaflet.js**.
*   **Comunicação**: O fluxo é uni-direcional (Backend -> Frontend) para envios de posicionamento, log e ETAs (estimativa de tempo de chegada). A alteração de estado (pausa/retoma) é feita via requisições POST pontuais.

## Fluxo do Sistema

1.  O servidor (`main.go`) inicia as rotinas e a simulação de movimentação do veículo em background. O `simulation.go` faz fetch no *OSRM* e interage com as coordenadas.
2.  Telas de clientes e do vendedor se conectam por um fluxo `EventSource` na rota `/stream`.
3.  O Backend varre e calcula num loop o ETA particular de cada cliente listado no arquivo de configuração (`config.go`).
4.  O payload JSON embutido no evento SSE é propagado imediatamente contendo *Posicionamento do Vendedor*, *Lista de distâncias ETA para Clientes* e *Logs*.

## Estrutura de Arquivos

```
.
├── app/
│   ├── api.go         # Declaração dos endpoints (/position, /stream, /control)
│   ├── config.go      # Constantes e Lista de Clientes Fixos (Source of Truth do Backend)
│   ├── eta.go         # Lógica matemática (Haversine e segundos de distância)
│   ├── geo.go         # Helpers de matemática espacial 
│   ├── main.go        # Ponto de entrada, ListenAndServe, inicializador
│   ├── osrm.go        # Integração e fetch da API Project OSRM
│   ├── simulation.go  # Lógica do mock de GPS, steps da rota, timing
│   └── tracker.go     # Core em memória: Mutex da posição, array de inscritos no canal 
├── web/
│   └── static/
│       ├── css/
│       │   └── style.css      # Estilos com UI minimalista e paleta em tom laranja
│       ├── js/             
│       │   ├── client.js      # Lída com a recepção do SSE do lado do Cliente e notificações Push
│       │   ├── config.js      # Source of truth Front (mesmas coordenadas/Id dos configs em Go)
│       │   ├── map.js         # Setup de layer do Leaflet
│       │   ├── marker.js      # Classes helper e managers
│       │   ├── stream.js      # Isolamento SSE
│       │   └── vendor.js      # Controlador e renderizador do vendedor (Lista de clientes, logs globais)
│       ├── client.html        # View - Tela individual do cliente 
│       ├── index.html         # Portal geral e Hub de Links
│       └── vendor.html        # View - Painel do Carro
├── go.mod
└── README.md
```

## Setup & Como Rodar (Local)

1. Tenha o **Go 1.20+** instalado.
2. Navegue até a raiz deste repositório e rode o servidor:
   ```bash
   go run ./app
   ```
3. O servidor iniciará em `http://localhost:8080`.

## Endpoints (API)

| Rota | Método | Descrição |
| --- | --- | --- |
| `/position` | GET | Snapshot global simples do tracker (`EventData`) |
| `/stream` | GET (SSE) | Conexão persistente (Server-Sent Events) |
| `/control` | POST | Comandos interativos (`{"action": "pause/resume/reset"}`) |
| `/client/:id`| GET | Serve a view `client.html` atribuindo a URL context route |

## Configuração

**Adicionar Clientes**
Abra `app/config.go` e acesse a variável `FixedClients`.
Abra `web/static/js/config.js` e adicione este id novo na var `CLIENTS`.

**Proximidade**
Para alterar o range onde a notificação dispara:
Altere `ProximityMeters` em ambas `config.go` (Backend) e `config.js` (Frontend).

## Roteiro de Demonstração

Para facilitar apresetanções ou Live Demos, sugere-se a seguinte abertura de telas:

1. Acesse o HUB em `http://localhost:8080/`.
2. Em uma aba nova abra a **Tela do Vendedor**: `http://localhost:8080/vendor.html` (Mostre os logs entrando e a rota viva).
3. Na janela do Hub selecione a opção que abre a aba `Cliente: Maria` (`/client/cliente-1`). 
4. Mostre e permita notificações da "Maria" (o browser pedirá solicitação à direita).
5. Mostre o **Painel do Vendedor** (Pode usar a interface do Vendedor para apertar em `Pausar` e provar que todas as abas das clientelas atualizam junto para o status "Pausado").
6. Uma vez que o Carrinho entrar dentro do círculo demarcado no raio de 500 metros, repare a notificação Push acionando ao nível de SO da máquina.
