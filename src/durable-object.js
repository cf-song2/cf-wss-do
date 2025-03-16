export class ChatDO {
    constructor(state) {
      this.state = state;
      this.connections = new Map();  // clientId → { socket, serverSocket }
    }
  
    async fetch(request) {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket", { status: 400 });
      }
  
      const url = new URL(request.url);
      const clientId = url.searchParams.get("clientId") || crypto.randomUUID();
  
      const [clientWs, doClientSide] = new WebSocketPair();
      doClientSide.accept();
  
      if (this.connections.has(clientId)) {
        const old = this.connections.get(clientId);
        old.clientSocket.close(1000, "Reconnected");
        old.serverSocket.close(1000, "Reconnected");
        console.log(`[DO] Existing connection for ${clientId} closed.`);
      }
  
      try {
        console.log(`[DO] Connecting backend for ${clientId}`);
        const backendResp = await fetch("wss://spectrum.cecil-personal.site/ws", {
          headers: { "Upgrade": "websocket" }
        });
  
        const serverSocket = backendResp.webSocket;
        serverSocket.accept();
  
        this.connections.set(clientId, {
          clientSocket: doClientSide,
          serverSocket
        });
  
        doClientSide.addEventListener("message", e => {
          serverSocket.send(e.data);
        });
  
        serverSocket.addEventListener("message", e => {
          doClientSide.send(e.data);
        });
  
        const closeBoth = () => {
          doClientSide.close();
          serverSocket.close();
          this.connections.delete(clientId);
          console.log(`[DO] Disconnected ${clientId}`);
        };
  
        doClientSide.addEventListener("close", closeBoth);
        serverSocket.addEventListener("close", closeBoth);
  
      } catch (err) {
        console.error("[DO] Backend connect error:", err);
        doClientSide.close(1011, "Internal error");
      }
  
      return new Response(null, { status: 101, webSocket: clientWs });
    }
  }
  