import { ChatDO } from './durable-object.js';

export default {
  async fetch(request, env, ctx) {
    const upgradeHeader = request.headers.get("Upgrade");

    if (upgradeHeader && upgradeHeader.toLowerCase() === "websocket") {
      const id = env.CHAT_DO.idFromName("proxy-room");
      const stub = env.CHAT_DO.get(id);

      console.log("[Worker] Forwarding WebSocket request to DO");
      return await stub.fetch(request);
    }

    return fetch(request);
  }
};

export { ChatDO };
