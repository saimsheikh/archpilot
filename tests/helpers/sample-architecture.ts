/** Minimal valid input for export_architecture_md. */
export const SAMPLE_ARCHITECTURE = {
  title: "Recipe Box",
  summary: "Lets home cooks save and search recipes.",
  components: [
    { name: "Web app", responsibility: "UI | search", technology: "Next.js" },
    { name: "API", responsibility: "CRUD and search" },
  ],
  dataFlow: [{ from: "Web app", to: "API", description: "HTTPS JSON" }],
  decisions: [
    {
      decision: "Postgres full-text search",
      rationale: "One datastore to run.",
      tradeoffs: "Weaker relevance than a search engine.",
      alternativesRejected: ["Elasticsearch: too much ops for v1"],
    },
  ],
  risks: [
    {
      risk: "Search slows past 1M recipes",
      category: "scaling",
      likelihood: "low",
      mitigation: "GIN index; revisit at 500k rows.",
    },
  ],
  openQuestions: ["Do we need offline mode?"],
};
