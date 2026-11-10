---
id: data-ml-pipeline
name: Data / ML pipeline
when_to_use:
  - Data from several sources must be collected, cleaned and joined on a schedule
  - Dashboards, reports or ML models are built on that data
  - You need reproducible training runs and model versioning
scale_range: "GBs to tens of TBs; hourly to daily batches"
components:
  - Source connectors (databases, SaaS APIs, event streams)
  - Raw landing zone in object storage
  - Orchestrator (Airflow, Dagster, Prefect)
  - Transformation layer (dbt or Spark)
  - Data warehouse or lakehouse
  - Data quality checks
  - Feature store or feature tables
  - Model training jobs and model registry
  - Batch or online model serving
  - BI dashboards
failure_modes:
  - Upstream schema change silently breaks transforms or produces nulls
  - Late or partial data produces wrong reports that nobody notices
  - Training/serving skew when features are computed differently in each path
  - Model quality drifts after deployment without monitoring
  - Backfills overwhelm the warehouse budget
cost_drivers:
  - Warehouse compute (queries and transforms)
  - Storage of raw and intermediate data
  - GPU or CPU time for training
tags:
  [
    data,
    etl,
    elt,
    ml,
    machine-learning,
    analytics,
    warehouse,
    batch,
    dbt,
    airflow,
    features,
    training,
    dashboards,
  ]
---

# Data / ML pipeline

Land raw data unchanged, transform it into tested models in a warehouse, and train and
serve ML models from the same feature definitions.

## Diagram

```mermaid
flowchart LR
  sources[("App DB, SaaS APIs, events")] --> connectors["Connectors"]
  connectors --> raw[("Raw zone: object storage")]
  orchestrator["Orchestrator"] -.-> connectors
  orchestrator -.-> transform
  orchestrator -.-> training
  raw --> transform["Transforms: dbt / Spark"]
  transform --> quality{"Quality checks"}
  quality -->|pass| warehouse[("Warehouse")]
  quality -->|fail| alerts["Alerts"]
  warehouse --> bi["BI dashboards"]
  warehouse --> features[("Feature tables")]
  features --> training["Training jobs"]
  training --> registry[("Model registry")]
  registry --> serving["Model serving"]
  features --> serving
```

## Trade-offs

- **ELT in the warehouse vs ETL in Spark:** ELT with dbt is simpler and testable in SQL;
  Spark only when data or transforms outgrow the warehouse.
- **Managed connectors vs custom:** buy connectors for SaaS sources; write custom ones only
  for internal systems.
- **Feature store:** heavy for one or two models; feature tables in the warehouse plus a
  shared feature definition library are enough to start.
- **Batch vs online serving:** batch predictions written to a table are far simpler;
  online serving only when predictions depend on request-time data.

## Failure modes and mitigations

1. **Schema drift.** Contract tests on sources, and fail loudly on unexpected columns or
   types instead of coercing.
2. **Late or partial data.** Freshness and row-count checks per table; publish dashboards
   only after checks pass.
3. **Training/serving skew.** One feature definition used by both training and serving;
   log served features and compare distributions.
4. **Model drift.** Monitor prediction distributions and delayed ground-truth metrics;
   retrain on a schedule with a champion/challenger gate.
5. **Backfill cost.** Partition tables, backfill incrementally, and set warehouse budgets.

## Do not use it for

- Real-time decisions under 100 ms on fresh events: use a streaming design.
- A single small database with a few reports: query a read replica directly.
- One-off analysis: a notebook is fine; do not build a pipeline.
