export function parseGoogleMapsLink(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    const allowed = ["google.com", "www.google.com", "maps.google.com", "google.co.id", "www.google.co.id", "maps.google.co.id"].includes(host)
      ? (url.pathname.startsWith("/maps") || host.startsWith("maps."))
      : host === "maps.app.goo.gl" || (host === "goo.gl" && url.pathname.startsWith("/maps"));
    if (url.protocol !== "https:" || !allowed || url.username || url.password) return null;
    const decoded = decodeURIComponent(url.href);
    const match = decoded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
      || decoded.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
      || (url.searchParams.get("query") || url.searchParams.get("q") || "").match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
    const lat = match ? Number(match[1]) : null;
    const lng = match ? Number(match[2]) : null;
    const validCoords = lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    return { url: url.href, lat: validCoords ? lat : null, lng: validCoords ? lng : null };
  } catch { return null; }
}
