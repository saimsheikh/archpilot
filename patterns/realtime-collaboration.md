---
id: realtime-collaboration
name: Realtime collaboration app
when_to_use:
  - Several users edit or view the same document, board or canvas at the same time
  - Changes must appear for others within about 100 to 500 ms
  - Presence (cursors, who is online) is part of the product
scale_range: "10 to 100k concurrent connections; 2 to 100 users per document"
components:
  - Client with local state and CRDT or OT engine
  - WebSocket gateway
  - Collaboration service (rooms, sync, presence)
  - Pub/sub layer between gateway nodes (Redis or similar)
  - Document snapshot store (Postgres or object storage)
  - Update log
  - REST API for non-realtime operations
  - Auth with per-document permissions
failure_modes:
  - Conflicting concurrent edits corrupt or lose data
  - A server node dies and its rooms lose unsaved updates
  - Reconnect storm after a deploy overloads the gateway
  - Large documents make the initial sync slow and memory-heavy
  - Permission changes are not applied to already-open connections
cost_drivers:
  - Long-lived connections (memory per connection)
  - Pub/sub fan-out traffic
  - Snapshot storage and update log retention
tags:
  [
    realtime,
    collaboration,
    websocket,
    crdt,
    multiplayer,
    live,
    presence,
    editor,
    whiteboard,
    sync,
    chat,
  ]
---

# Realtime collaboration app

Clients hold a local copy of the document and exchange small updates over WebSockets.
A CRDT or OT engine makes concurrent edits converge; the server persists snapshots.

## Diagram

```mermaid
flowchart TD
  clientA(["Client A: local CRDT"]) <--> gateway["WebSocket gateway"]
  clientB(["Client B: local CRDT"]) <--> gateway
  gateway --> collab["Collaboration service: rooms + presence"]
  collab <--> pubsub[["Pub/sub between nodes"]]
  collab --> log[("Update log")]
  collab --> snapshots[("Document snapshots")]
  clientA --> rest["REST API"]
  rest --> auth["Auth + document permissions"]
  gateway --> auth
```

## Trade-offs

- **CRDT library (Yjs, Automerge) vs OT:** a CRDT library handles offline edits and needs
  no central transform server; OT is proven for text but you will not write it correctly
  yourself. Use a library.
- **Managed realtime service vs own gateway:** managed services remove connection scaling
  work; your own gateway gives control and lower cost at scale.
- **Room affinity:** routing all users of a document to one node is simple and fast, but
  that node becomes a hotspot and single point of loss; persist updates before ack.

## Failure modes and mitigations

1. **Conflicting edits.** Use a CRDT/OT library; never last-write-wins whole documents.
2. **Node loss.** Append updates to a durable log before acknowledging; snapshot
   periodically and replay the log on recovery.
3. **Reconnect storms.** Client reconnect with jittered backoff; drain connections
   gradually during deploys.
4. **Slow initial sync.** Load the latest snapshot plus recent updates, compact history,
   and lazy-load large parts.
5. **Stale permissions.** Re-check permissions on each update batch and push revocations to
   connected clients.

## Do not use it for

- Data that changes every few minutes: polling or server-sent events are enough.
- Single-user editing with save: a normal REST API is simpler.
- Strictly ordered financial transactions: use a transactional database, not a CRDT.
