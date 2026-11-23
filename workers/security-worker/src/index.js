const securityHeaders = {
  "Content-Security-Policy":
    "base-uri 'self'; object-src 'none'; frame-ancestors 'self'",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
};

function safePageName(segment) {
  try {
    const name = decodeURIComponent(segment);
    return /^[A-Za-z0-9_-]+$/.test(name) ? name : null;
  } catch {
    return null;
  }
}

function rewriteInternalLinks(body) {
  return body
    .replace(
      /(href|src)=["'](?:\.{1,2}\/)?html\/([A-Za-z0-9_-]+)\.html([^"']*)["']/gi,
      '$1="/dia-danh/$2"',
    )
    .replace(
      /(["'`])(?:\.{1,2}\/)?html\/([A-Za-z0-9_-]+)\.html\1/g,
      '$1/dia-danh/$2$1',
    );
}

function rewritePlacePagePaths(body) {
  return body
    .replace(
      /src=["']\.\/header_footer_fplaces\.js["']/gi,
      'src="/html/header_footer_fplaces.js?v=place-links-20261123"',
    )
    .replace(
      /(href|src)=["']\.\.\/([^"'#]+)["']/gi,
      '$1="/$2"',
    )
    .replace(
      /(href|src)=["']\.\/([A-Za-z0-9_-]+)\.html([^"'#]*)["']/gi,
      '$1="/dia-danh/$2"',
    )
    .replace(
      /(href|src)=["']\.\/([^"'#]+)["']/gi,
      '$1="/html/$2"',
    );
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/html/")) {
      const pageName = safePageName(url.pathname.slice("/html/".length).replace(/\.html$/i, ""));
      if (pageName) {
        return Response.redirect(
          new URL(`/dia-danh/${encodeURIComponent(pageName)}${url.search}${url.hash}`, url.origin),
          301,
        );
      }
    }

    if (url.pathname.startsWith("/dia-danh/")) {
      const pageName = safePageName(url.pathname.slice("/dia-danh/".length));
      if (pageName) {
        const upstreamUrl = new URL(`/html/${encodeURIComponent(pageName)}.html`, url.origin);
        const upstreamResponse = await fetch(upstreamUrl);
        const headers = new Headers(upstreamResponse.headers);

        for (const [name, value] of Object.entries(securityHeaders)) {
          headers.set(name, value);
        }
        headers.set("Cache-Control", "no-cache, must-revalidate");
        headers.set("X-Robots-Tag", "noindex, nofollow");

        if (new URL(request.url).protocol === "https:") {
          headers.set("Strict-Transport-Security", "max-age=31536000");
        }

        if (headers.get("Content-Type")?.includes("text/html")) {
          const body = await upstreamResponse.text();
          const rewrittenBody = rewritePlacePagePaths(
            rewriteInternalLinks(body),
          );
          return new Response(rewrittenBody, {
            status: upstreamResponse.status,
            statusText: upstreamResponse.statusText,
            headers,
          });
        }

        return new Response(upstreamResponse.body, {
          status: upstreamResponse.status,
          statusText: upstreamResponse.statusText,
          headers,
        });
      }
      return new Response("Không tìm thấy trang.", { status: 404 });
    }

    const response = await fetch(request);
    const headers = new Headers(response.headers);

    for (const [name, value] of Object.entries(securityHeaders)) {
      headers.set(name, value);
    }

    if (new URL(request.url).protocol === "https:") {
      headers.set("Strict-Transport-Security", "max-age=31536000");
    }

    const contentType = headers.get("Content-Type") || "";
    if (
      contentType.includes("text/html") ||
      contentType.includes("text/css") ||
      contentType.includes("javascript")
    ) {
      headers.set("Cache-Control", "no-cache, must-revalidate");
    }

    if (
      contentType.includes("text/html") ||
      contentType.includes("javascript")
    ) {
      const body = await response.text();
      headers.set("X-Robots-Tag", "noindex, nofollow");
      return new Response(rewriteInternalLinks(body), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
