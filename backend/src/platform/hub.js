/**
 * Live updates over Server-Sent Events. Each signed-in browser tab opens GET /api/events and receives
 * events addressed to its account (a booking it is part of changed, a new chat message, Bhaai-Rate, SOS…).
 * In-memory: fine for one backend process, which is how this app runs.
 */
export function createHub() {
  const clients = new Map(); // accountId -> Set<res>
  return {
    subscribe(accountId, res) {
      const key = String(accountId);
      if (!clients.has(key)) clients.set(key, new Set());
      clients.get(key).add(res);
      return () => { const set = clients.get(key); set?.delete(res); if (set && !set.size) clients.delete(key); };
    },
    /** Send `event` with `data` to every open tab of each account id given. */
    publish(accountIds, event, data) {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      for (const id of new Set(accountIds.filter(Boolean).map(String))) for (const res of clients.get(id) || []) res.write(payload);
    },
    /** Send to every connected tab (used for public map updates such as a worker's live position). */
    broadcast(event, data) {
      const payload = `event: ${event}
data: ${JSON.stringify(data)}

`;
      for (const set of clients.values()) for (const res of set) res.write(payload);
    },
    online(accountId) { return clients.has(String(accountId)); },
  };
}
