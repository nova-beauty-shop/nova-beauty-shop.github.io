export function shieldImageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  const bad = [32, 9, 10, 13, 34, 39, 40, 41, 92, 60, 62, 96].map((c) => String.fromCharCode(c));
  if (!trimmed.startsWith("https://") || trimmed.length <= 8 || bad.some((c) => trimmed.includes(c))) {
    return trimmed;
  }
  if (trimmed.includes("wsrv.nl") || trimmed.includes("supabase.co")) {
    return trimmed;
  }
  return "https://wsrv.nl/?url=" + encodeURIComponent(trimmed) + "&output=webp&q=85";
}
