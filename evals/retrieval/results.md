# Retrieval eval results

| Retriever    | Cases | Top-1 | Top-3 |
| ------------ | ----- | ----- | ----- |
| bm25         | 20    | 85%   | 100%  |
| keyword+tags | 20    | 90%   | 100%  |

## Top-1 misses (with the top 3 returned)

- **bm25**: "A project management tool sold to companies, each company has its own workspace, admins invite teammates and pay monthly per seat" expected `multi-tenant-saas`, got `internal-admin-tool`, `multi-tenant-saas`, `rag-app`
- **bm25**: "Ingest IoT sensor readings from devices and fan them out to alerting, storage and billing consumers" expected `event-driven-pipeline`, got `multi-tenant-saas`, `event-driven-pipeline`, `rag-app`
- **bm25**: "Google Docs style editor where multiple people type in the same document at the same time" expected `realtime-collaboration`, got `rag-app`, `realtime-collaboration`, `data-ml-pipeline`
- **keyword+tags**: "A project management tool sold to companies, each company has its own workspace, admins invite teammates and pay monthly per seat" expected `multi-tenant-saas`, got `internal-admin-tool`, `agent-system`, `multi-tenant-saas`
- **keyword+tags**: "Ingest IoT sensor readings from devices and fan them out to alerting, storage and billing consumers" expected `event-driven-pipeline`, got `multi-tenant-saas`, `mobile-api-backend`, `event-driven-pipeline`
