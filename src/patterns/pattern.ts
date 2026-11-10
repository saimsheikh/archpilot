import { z } from "zod";

const items = (min: number) => z.array(z.string().trim().min(1)).min(min);

export const patternMetaSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "id must be kebab-case"),
  name: z.string().trim().min(1),
  when_to_use: items(1),
  scale_range: z.string().trim().min(1),
  components: items(1),
  failure_modes: items(3),
  cost_drivers: items(1),
  tags: items(1),
});

export type PatternMeta = z.infer<typeof patternMetaSchema>;

export interface Pattern {
  meta: PatternMeta;
  /** Markdown body after the frontmatter. */
  body: string;
  /** Source of the first mermaid code block in the body. */
  mermaid: string;
}
