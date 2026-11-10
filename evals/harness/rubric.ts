export const RUBRIC_CRITERIA = [
  "auth",
  "dataStore",
  "failureHandling",
  "observability",
  "cost",
  "security",
] as const;

export type RubricCriterion = (typeof RUBRIC_CRITERIA)[number];
export type RubricScores = Record<RubricCriterion, 0 | 1>;

// Keyword evidence that a concern is addressed. This is deliberately simple and
// deterministic: it shows whether a topic is mentioned, not whether it is handled well.
const EVIDENCE: Readonly<Record<RubricCriterion, RegExp>> = {
  auth: /\b(auth\w*|login|log in|sign[- ]?in|sso|oauth|oidc|saml|jwt|identity provider)\b/i,
  dataStore:
    /\b(postgres\w*|mysql|database|datastore|data store|dynamodb|mongo\w*|redis|sqlite|warehouse|bigquery|snowflake|s3|object storage|timescale\w*)\b/i,
  failureHandling:
    /\b(retr(y|ies)|dead[- ]letter|dlq|fallback|timeouts?|circuit breaker|idempoten\w*|failover|backups?|redundan\w*|graceful degradation)\b/i,
  observability:
    /\b(observability|logging|logs|metrics|tracing|traces|monitoring|alert(s|ing)?|dashboards? for ops|opentelemetry|sentry|datadog)\b/i,
  cost: /\b(costs?|budget|pricing|spend|\$\d+|per[- ]request cost|cost per)\b/i,
  security:
    /\b(security|encrypt\w*|tls|https|secrets?|rbac|role[- ]based|permissions?|least[- ]privilege|prompt injection|gdpr|hipaa|pci|audit log)\b/i,
};

export function scoreRubric(text: string): RubricScores {
  const entries = RUBRIC_CRITERIA.map((criterion) => [
    criterion,
    EVIDENCE[criterion].test(text) ? 1 : 0,
  ]);
  return Object.fromEntries(entries) as RubricScores;
}

export function rubricTotal(scores: RubricScores): number {
  return RUBRIC_CRITERIA.reduce((sum, criterion) => sum + scores[criterion], 0);
}
