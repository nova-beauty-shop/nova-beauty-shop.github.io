const IMG_MAP: Record<string, string> = {
  "https://images.pexels.com/photos/7814956/pexels-photo-7814956.jpeg?auto=compress&cs=tinysrgb&w=900": "/products/img-3.webp",
  "https://images.pexels.com/photos/7814956/pexels-photo-7814956.jpeg": "/products/img-31.webp",
  "https://images.pexels.com/photos/17307533/pexels-photo-17307533.jpeg?auto=compress&cs=tinysrgb&w=900": "/products/img-4.webp",
  "https://images.pexels.com/photos/17307533/pexels-photo-17307533.jpeg": "/products/img-36.webp",
  "https://images.pexels.com/photos/7797735/pexels-photo-7797735.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-5.webp",
  "https://images.pexels.com/photos/7797735/pexels-photo-7797735.jpeg": "/products/img-5.webp",
  "https://images.pexels.com/photos/7797453/pexels-photo-7797453.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-6.webp",
  "https://images.pexels.com/photos/7797453/pexels-photo-7797453.jpeg": "/products/img-6.webp",
  "https://images.pexels.com/photos/7797102/pexels-photo-7797102.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-7.webp",
  "https://images.pexels.com/photos/7797102/pexels-photo-7797102.jpeg": "/products/img-7.webp",
  "https://images.pexels.com/photos/6800938/pexels-photo-6800938.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-8.webp",
  "https://images.pexels.com/photos/6800938/pexels-photo-6800938.jpeg": "/products/img-8.webp",
  "https://images.pexels.com/photos/7795661/pexels-photo-7795661.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-9.webp",
  "https://images.pexels.com/photos/7795661/pexels-photo-7795661.jpeg": "/products/img-9.webp",
  "https://images.pexels.com/photos/19808300/pexels-photo-19808300.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-10.webp",
  "https://images.pexels.com/photos/19808300/pexels-photo-19808300.jpeg": "/products/img-10.webp",
  "https://images.pexels.com/photos/7038196/pexels-photo-7038196.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-11.webp",
  "https://images.pexels.com/photos/7038196/pexels-photo-7038196.jpeg": "/products/img-11.webp",
  "https://images.pexels.com/photos/8128067/pexels-photo-8128067.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-12.webp",
  "https://images.pexels.com/photos/8128067/pexels-photo-8128067.jpeg": "/products/img-12.webp",
  "https://images.pexels.com/photos/8015482/pexels-photo-8015482.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-13.webp",
  "https://images.pexels.com/photos/8015482/pexels-photo-8015482.jpeg": "/products/img-13.webp",
  "https://images.pexels.com/photos/7670764/pexels-photo-7670764.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-14.webp",
  "https://images.pexels.com/photos/7670764/pexels-photo-7670764.jpeg": "/products/img-14.webp",
  "https://images.pexels.com/photos/8128063/pexels-photo-8128063.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-15.webp",
  "https://images.pexels.com/photos/8128063/pexels-photo-8128063.jpeg": "/products/img-15.webp",
  "https://images.pexels.com/photos/4202328/pexels-photo-4202328.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-16.webp",
  "https://images.pexels.com/photos/4202328/pexels-photo-4202328.jpeg": "/products/img-16.webp",
  "https://images.pexels.com/photos/8128064/pexels-photo-8128064.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-17.webp",
  "https://images.pexels.com/photos/8128064/pexels-photo-8128064.jpeg": "/products/img-17.webp",
  "https://images.pexels.com/photos/4202326/pexels-photo-4202326.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-18.webp",
  "https://images.pexels.com/photos/4202326/pexels-photo-4202326.jpeg": "/products/img-18.webp",
  "https://images.pexels.com/photos/850801/pexels-photo-850801.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-19.webp",
  "https://images.pexels.com/photos/850801/pexels-photo-850801.jpeg": "/products/img-19.webp",
  "https://images.pexels.com/photos/4889718/pexels-photo-4889718.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-20.webp",
  "https://images.pexels.com/photos/4889718/pexels-photo-4889718.jpeg": "/products/img-20.webp",
  "https://images.pexels.com/photos/90269/pexels-photo-90269.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-21.webp",
  "https://images.pexels.com/photos/90269/pexels-photo-90269.jpeg": "/products/img-21.webp",
  "https://images.pexels.com/photos/28968483/pexels-photo-28968483.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-22.webp",
  "https://images.pexels.com/photos/28968483/pexels-photo-28968483.jpeg": "/products/img-22.webp",
  "https://images.pexels.com/photos/26927323/pexels-photo-26927323.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-23.webp",
  "https://images.pexels.com/photos/26927323/pexels-photo-26927323.jpeg": "/products/img-23.webp",
  "https://images.pexels.com/photos/4938498/pexels-photo-4938498.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-24.webp",
  "https://images.pexels.com/photos/4938498/pexels-photo-4938498.jpeg": "/products/img-24.webp",
  "https://images.pexels.com/photos/12606876/pexels-photo-12606876.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-25.webp",
  "https://images.pexels.com/photos/12606876/pexels-photo-12606876.jpeg": "/products/img-25.webp",
  "https://images.pexels.com/photos/4735908/pexels-photo-4735908.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-26.webp",
  "https://images.pexels.com/photos/4735908/pexels-photo-4735908.jpeg": "/products/img-26.webp",
  "https://images.pexels.com/photos/29611647/pexels-photo-29611647.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-27.webp",
  "https://images.pexels.com/photos/29611647/pexels-photo-29611647.jpeg": "/products/img-27.webp",
  "https://images.pexels.com/photos/4736027/pexels-photo-4736027.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-28.webp",
  "https://images.pexels.com/photos/4736027/pexels-photo-4736027.jpeg": "/products/img-28.webp",
  "https://images.pexels.com/photos/7814959/pexels-photo-7814959.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-29.webp",
  "https://images.pexels.com/photos/7814959/pexels-photo-7814959.jpeg": "/products/img-29.webp",
  "https://images.pexels.com/photos/7814961/pexels-photo-7814961.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-30.webp",
  "https://images.pexels.com/photos/7814961/pexels-photo-7814961.jpeg": "/products/img-30.webp",
  "https://images.pexels.com/photos/7814956/pexels-photo-7814956.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-31.webp",
  "https://images.pexels.com/photos/8691537/pexels-photo-8691537.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-32.webp",
  "https://images.pexels.com/photos/8691537/pexels-photo-8691537.jpeg": "/products/img-32.webp",
  "https://images.pexels.com/photos/4408447/pexels-photo-4408447.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-33.webp",
  "https://images.pexels.com/photos/4408447/pexels-photo-4408447.jpeg": "/products/img-33.webp",
  "https://images.pexels.com/photos/31401740/pexels-photo-31401740.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-34.webp",
  "https://images.pexels.com/photos/31401740/pexels-photo-31401740.jpeg": "/products/img-34.webp",
  "https://images.pexels.com/photos/12146904/pexels-photo-12146904.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-35.webp",
  "https://images.pexels.com/photos/12146904/pexels-photo-12146904.jpeg": "/products/img-35.webp",
  "https://images.pexels.com/photos/17307533/pexels-photo-17307533.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-36.webp",
  "https://images.pexels.com/photos/7796587/pexels-photo-7796587.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-37.webp",
  "https://images.pexels.com/photos/7796587/pexels-photo-7796587.jpeg": "/products/img-37.webp",
  "https://images.pexels.com/photos/4202325/pexels-photo-4202325.jpeg?auto=compress&cs=tinysrgb&w=1200": "/products/img-38.webp",
  "https://images.pexels.com/photos/4202325/pexels-photo-4202325.jpeg": "/products/img-38.webp",
  "https://images.pexels.com/photos/3762756/pexels-photo-3762756.jpeg?auto=compress&cs=tinysrgb&w=900": "/products/img-39.webp",
  "https://images.pexels.com/photos/3762756/pexels-photo-3762756.jpeg": "/products/img-45.webp",
  "https://images.pexels.com/photos/2823975/pexels-photo-2823975.jpeg?auto=compress&cs=tinysrgb&w=900": "/products/img-40.webp",
  "https://images.pexels.com/photos/2823975/pexels-photo-2823975.jpeg": "/products/img-40.webp",
  "https://images.pexels.com/photos/6681391/pexels-photo-6681391.jpeg?auto=compress&cs=tinysrgb&w=900": "/products/img-41.webp",
  "https://images.pexels.com/photos/6681391/pexels-photo-6681391.jpeg": "/products/img-41.webp",
  "https://images.pexels.com/photos/3764479/pexels-photo-3764479.jpeg?auto=compress&cs=tinysrgb&w=900": "/products/img-42.webp",
  "https://images.pexels.com/photos/3764479/pexels-photo-3764479.jpeg": "/products/img-42.webp",
  "https://images.pexels.com/photos/10648949/pexels-photo-10648949.jpeg?auto=compress&cs=tinysrgb&w=900": "/products/img-43.webp",
  "https://images.pexels.com/photos/10648949/pexels-photo-10648949.jpeg": "/products/img-43.webp",
  "https://images.pexels.com/photos/6706877/pexels-photo-6706877.jpeg?auto=compress&cs=tinysrgb&w=900": "/products/img-44.webp",
  "https://images.pexels.com/photos/6706877/pexels-photo-6706877.jpeg": "/products/img-44.webp",
  "https://images.pexels.com/photos/3762756/pexels-photo-3762756.jpeg?auto=compress&cs=tinysrgb&w=1600": "/products/img-45.webp",
  "https://geigptbypnucbosuycwo.supabase.co/storage/v1/object/public/catalog-media/3bd9566e-8645-454d-8bf0-36e5e4ddb81a.jpg": "/products/img-46.webp",
  "https://images.pexels.com/photos/7670764/pexels-photo-7670764.jpeg?auto=compress&cs=tinysrgb&w=900": "/products/img-14.webp",
  "https://images.pexels.com/photos/12606876/pexels-photo-12606876.jpeg?auto=compress&cs=tinysrgb&w=900": "/products/img-25.webp"
};

function isFilteredHost(u: string): boolean {
  const l = u.toLowerCase();
  return (
    l.includes("unsplash.com") ||
    l.includes("pexels.com") ||
    l.includes("pixabay.com") ||
    l.includes("imgur.com") ||
    l.includes("pinimg.com") ||
    l.includes("picsum.photos")
  );
}

export function resolveImageUrl(u: string): string {
  if (!u || typeof u !== "string") return u;
  const s = u.trim();
  if (!s || s.startsWith("data:") || s.startsWith("blob:")) return s;
  if (s.startsWith("./products/")) return "/" + s.slice(2);
  if (IMG_MAP[s]) return IMG_MAP[s];
  const base = s.split("?")[0];
  if (IMG_MAP[base]) return IMG_MAP[base];
  if ((s.startsWith("http://") || s.startsWith("https://")) && isFilteredHost(s) && !s.includes("wsrv.nl")) {
    return "https://wsrv.nl/?url=" + encodeURIComponent(s) + "&output=webp&q=85";
  }
  return s;
}

function deepRewriteImages(val: any): any {
  if (typeof val === "string") {
    if (val.startsWith("http://") || val.startsWith("https://") || val.startsWith("./products/")) {
      return resolveImageUrl(val);
    }
    return val;
  }
  if (Array.isArray(val)) return val.map(deepRewriteImages);
  if (val && typeof val === "object") {
    const out: Record<string, any> = {};
    for (const k of Object.keys(val)) {
      out[k] = deepRewriteImages(val[k]);
    }
    return out;
  }
  return val;
}

if (typeof window !== "undefined") {
  const origFetch = window.fetch.bind(window);
  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const res = await origFetch(input, init);
    try {
      const reqUrl = typeof input === "string" ? input : (input instanceof URL ? input.toString() : input.url);
      const method = (init?.method || (typeof input === "object" && "method" in input ? input.method : "GET")).toUpperCase();
      const ct = res.headers.get("content-type") || "";
      if (method === "GET" && reqUrl.includes("/rest/v1/") && ct.includes("application/json")) {
        const clone = res.clone();
        const data = await clone.json();
        const patched = deepRewriteImages(data);
        const newHeaders = new Headers(res.headers);
        newHeaders.delete("content-length");
        return new Response(JSON.stringify(patched), {
          status: res.status,
          statusText: res.statusText,
          headers: newHeaders
        });
      }
    } catch (e) {}
    return res;
  };

  function fixImgElement(el: Element) {
    if (!el || el.tagName !== "IMG") return;
    const img = el as HTMLImageElement;
    const raw = img.getAttribute("src") || "";
    if (!raw) return;
    const resolved = resolveImageUrl(raw);
    if (resolved !== raw) {
      img.setAttribute("data-orig-src", raw);
      img.src = resolved;
    }
  }

  window.addEventListener("error", function(e: Event) {
    const el = e.target as HTMLImageElement;
    if (!el || el.tagName !== "IMG") return;
    const orig = el.getAttribute("data-orig-src") || el.src || "";
    if (!orig || !orig.startsWith("http")) return;
    const step = parseInt(el.getAttribute("data-retry-step") || "0", 10);
    if (step === 0) {
      el.setAttribute("data-retry-step", "1");
      el.src = "https://wsrv.nl/?url=" + encodeURIComponent(orig) + "&output=webp&q=85";
    } else if (step === 1) {
      el.setAttribute("data-retry-step", "2");
      const noProto = orig.split("https://").join("").split("http://").join("");
      el.src = "https://i0.wp.com/" + noProto;
    }
  }, true);

  const obs = new MutationObserver(function(mutations) {
    for (const m of mutations) {
      if (m.type === "attributes" && m.target) {
        fixImgElement(m.target as Element);
      }
      m.addedNodes.forEach(function(n) {
        if (n.nodeType === 1) {
          const el = n as Element;
          fixImgElement(el);
          el.querySelectorAll("img").forEach(fixImgElement);
        }
      });
    }
  });
  obs.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src"]
  });
}