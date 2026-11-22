import assert from "node:assert/strict";
import test from "node:test";
import securityWorker from "../src/index.js";

test("adds security headers and preserves the upstream response", async () => {
  const originalFetch = globalThis.fetch;
  const upstreamRequest = new Request("https://diadanhvanhoc.com/community.html");

  try {
    globalThis.fetch = async (request) => {
      assert.equal(request, upstreamRequest);
      return new Response("community", {
        headers: { "X-Origin-Header": "preserved" },
      });
    };

    const response = await securityWorker.fetch(upstreamRequest);

    assert.equal(response.status, 200);
    assert.equal(await response.text(), "community");
    assert.equal(response.headers.get("X-Origin-Header"), "preserved");
    assert.equal(
      response.headers.get("Content-Security-Policy"),
      "base-uri 'self'; object-src 'none'; frame-ancestors 'self'",
    );
    assert.equal(response.headers.get("Permissions-Policy"), "camera=(), geolocation=(), microphone=()");
    assert.equal(
      response.headers.get("Referrer-Policy"),
      "strict-origin-when-cross-origin",
    );
    assert.equal(response.headers.get("Strict-Transport-Security"), "max-age=31536000");
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(response.headers.get("X-Frame-Options"), "SAMEORIGIN");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not enable HSTS on an HTTP response", async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async () => new Response(null, { status: 404 });

    const response = await securityWorker.fetch(
      new Request("http://diadanhvanhoc.com/missing"),
    );

    assert.equal(response.status, 404);
    assert.equal(response.headers.get("Strict-Transport-Security"), null);
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("redirects old HTML paths to clean place routes", async () => {
  const response = await securityWorker.fetch(
    new Request("https://diadanhvanhoc.com/html/Song_Huong.html"),
  );

  assert.equal(response.status, 301);
  assert.equal(
    response.headers.get("Location"),
    "https://diadanhvanhoc.com/dia-danh/Song_Huong",
  );
});

test("maps clean place routes to the hidden HTML file", async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async (request) => {
      assert.equal(
        String(request),
        "https://diadanhvanhoc.com/html/Song_Huong.html",
      );
      return new Response("<html>Hương</html>", {
        headers: { "Content-Type": "text/html" },
      });
    };

    const response = await securityWorker.fetch(
      new Request("https://diadanhvanhoc.com/dia-danh/Song_Huong"),
    );

    assert.equal(response.status, 200);
    assert.equal(await response.text(), "<html>Hương</html>");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rewrites HTML and JavaScript internal page links", async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async () =>
      new Response(
        '<a href="../html/Song_Huong.html">Sông Hương</a>; const p="./html/Song_Huong.html";',
        { headers: { "Content-Type": "text/javascript" } },
      );

    const response = await securityWorker.fetch(
      new Request("https://diadanhvanhoc.com/js/data.js"),
    );
    const body = await response.text();

    assert.equal(
      body,
      '<a href="/dia-danh/Song_Huong">Sông Hương</a>; const p="/dia-danh/Song_Huong";',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
