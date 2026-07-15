/** Build head() output with title, description, canonical, and og tags for a route. */
export interface RouteSeoInput {
  title: string;
  description: string;
  path: string;
  ogType?: "website" | "article";
}

export function routeSeo({ title, description, path, ogType = "website" }: RouteSeoInput) {
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: ogType },
      { property: "og:url", content: path },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
    links: [{ rel: "canonical", href: path }],
  };
}
