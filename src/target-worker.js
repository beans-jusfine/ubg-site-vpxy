const blockedHosts = new Set(["localhost","localhost.localdomain","pornhub.com","www.pornhub.com","xvideos.com","www.xvideos.com","xhamster.com","www.xhamster.com","xnxx.com","www.xnxx.com","youporn.com","www.youporn.com","redtube.com","www.redtube.com","spankbang.com","www.spankbang.com","tube8.com","www.tube8.com","youjizz.com","www.youjizz.com"]);
const blockedSuffixes = [".pornhub.com",".xvideos.com",".xhamster.com",".xnxx.com",".youporn.com",".redtube.com",".spankbang.com",".tube8.com",".youjizz.com"];
export function parseTarget(value) {
  if (!value) return null;
  try { const target = new URL(value); if (target.username || target.password || (target.protocol !== "http:" && target.protocol !== "https:")) return null; return target; }
  catch { return null; }
}
export function isBlockedHost(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return blockedHosts.has(host) || blockedSuffixes.some(suffix => host.endsWith(suffix));
}
function isPublicIPv4(address) {
  const p = address.split(".").map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a,b,c] = p;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)) || (b === 88 && c === 99))) return false;
  if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}
function ipv6Value(address) {
  let value = address.toLowerCase().split("%")[0];
  if (value.includes(".")) {
    const index = value.lastIndexOf(":");
    const p = value.slice(index + 1).split(".").map(Number);
    if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    value = value.slice(0, index) + ":" + ((p[0] << 8) | p[1]).toString(16) + ":" + ((p[2] << 8) | p[3]).toString(16);
  }
  const halves = value.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = 8 - left.length - right.length;
  if ((halves.length === 1 && fill !== 0) || (halves.length === 2 && fill < 1)) return null;
  const groups = [...left, ...Array(fill).fill("0"), ...right];
  if (groups.length !== 8 || groups.some(group => !/^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.reduce((result, group) => (result << 16n) | BigInt("0x" + group), 0n);
}
function isPublicIPv6(address) {
  const value = ipv6Value(address);
  if (value === null) return false;
  if (value < 0x20000000000000000000000000000000n || value >= 0x40000000000000000000000000000000n) return false;
  if ((value >> 96n) === 0x20010db8n || (value >> 112n) === 0x2002n) return false;
  return true;
}
async function resolvePublic(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host.length > 253 || host === "localhost" || host.endsWith(".localhost") ||
      host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".test") ||
      isBlockedHost(host) || /^[0-9.]+$/.test(host) ||
      !/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(host)) return false;
  const answers = await Promise.all([1,28].map(async type => {
    const url = new URL("https://cloudflare-dns.com/dns-query");
    url.searchParams.set("name", host); url.searchParams.set("type", String(type));
    const response = await fetch(url, { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error("DNS lookup failed");
    const data = await response.json();
    return data.Status === 0 && Array.isArray(data.Answer) ? data.Answer.filter(item => item.type === type) : [];
  }));
  const records = answers.flat();
  return records.length > 0 && records.every(item => item.type === 1 ? isPublicIPv4(item.data) : isPublicIPv6(item.data));
}
export async function isTargetAllowed(target, allowPrivate = false) {
  if (isBlockedHost(target.hostname)) return false;
  if (allowPrivate) return true;
  const hostname = target.hostname.toLowerCase().replace(/\.$/, "");
  if (hostname.endsWith(".localhost") || hostname === "localhost") return false;
  if (/^[0-9.]+$/.test(hostname)) return isPublicIPv4(hostname);
  if (hostname.includes(":")) return isPublicIPv6(hostname.replace(/^\[|\]$/g, ""));
  try { return await resolvePublic(hostname); } catch { return false; }
}
