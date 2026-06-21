import authHandler from "./auth/index.ts";
import adminUsersHandler from "./admin-users/index.ts";
import requestsHandler from "./requests/index.ts";
import notificationsHandler from "./notifications/index.ts";
import promotionsHandler from "./promotions/index.ts";
import ratingsHandler from "./ratings/index.ts";
import testingHandler from "./testing/index.ts";

const handlers: Record<string, (req: Request) => Promise<Response>> = {
  "auth": authHandler,
  "admin-users": adminUsersHandler,
  "requests": requestsHandler,
  "notifications": notificationsHandler,
  "promotions": promotionsHandler,
  "ratings": ratingsHandler,
  "testing": testingHandler,
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
};

Deno.serve({ port: 54321 }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("", { headers: CORS_HEADERS, status: 200 });
  }

  const url = new URL(req.url);
  let pathParts = url.pathname.split("/").filter(Boolean);
  
  // Handle optional /functions/v1/ prefix
  if (pathParts[0] === "functions" && pathParts[1] === "v1") {
    pathParts = pathParts.slice(2);
  }

  const funcName = pathParts[0];
  const handler = handlers[funcName];

  if (handler) {
    try {
      console.log(`[local-supabase-api] Routing request: ${req.method} ${url.pathname}${url.search} to ${funcName}`);
      const response = await handler(req);
      
      // Inject CORS headers if not already set
      const headers = new Headers(response.headers);
      Object.entries(CORS_HEADERS).forEach(([key, val]) => {
        if (!headers.has(key)) {
          headers.set(key, val);
        }
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (e) {
      console.error(`[local-supabase-api] Error in function ${funcName}:`, e);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  }

  console.warn(`[local-supabase-api] Function not found: "${funcName}" for path ${url.pathname}`);
  return new Response(JSON.stringify({ error: `Function "${funcName}" not found` }), {
    status: 404,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
