const STOPWORDS = new Set(
  (
    "a an and are as at be but by can do for from has have i if in into is it its of on or our " +
    "so that the their them then there these they this to too us we what when where which " +
    "who will with you your app application need needs want build building make should " +
    "would like some all any each also just more most very"
  ).split(" "),
);

// Light suffix stripping so "tenants"/"tenant" and "queries"/"query" match. A real stemmer
// is not worth a dependency for a corpus this small.
function stem(token: string): string {
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 5 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith("ed")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token))
    .map(stem);
}
