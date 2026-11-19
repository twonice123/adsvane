// Connecting a business's Facebook Page and Instagram (Meta) account.
export const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}`;
export const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "business_management",
  "instagram_basic",
  "instagram_content_publish",
].join(",");

export function metaReady() {
  return !!(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

export function metaRedirect(origin: string) {
  return `${origin}/api/connect/meta/callback`;
}
