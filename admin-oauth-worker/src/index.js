// Cloudflare Worker بسيط لتفويض GitHub OAuth الخاص بلوحة Decap CMS.
// لا يخزن أي بيانات، فقط يبادل "code" بـ access_token عبر GitHub ويسلمه للوحة عبر postMessage.

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

function randomState() {
  return crypto.randomUUID();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/auth") {
      const state = randomState();
      const redirectUri = `${url.origin}/callback`;
      const authorizeUrl = new URL(GITHUB_AUTHORIZE_URL);
      authorizeUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      authorizeUrl.searchParams.set("redirect_uri", redirectUri);
      authorizeUrl.searchParams.set("scope", "repo,user");
      authorizeUrl.searchParams.set("state", state);
      return Response.redirect(authorizeUrl.toString(), 302);
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) {
        return new Response("Missing code", { status: 400 });
      }

      const tokenRes = await fetch(GITHUB_TOKEN_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error || !tokenData.access_token) {
        return new Response(`GitHub OAuth error: ${tokenData.error_description ?? "unknown"}`, {
          status: 401,
        });
      }

      const script = `
        (function() {
          function receiveMessage(message) {
            window.opener.postMessage(
              'authorization:github:success:${JSON.stringify({ token: tokenData.access_token, provider: "github" }).replace(/'/g, "\\'")}',
              '*'
            );
            window.removeEventListener('message', receiveMessage, false);
          }
          window.addEventListener('message', receiveMessage, false);
          window.opener.postMessage('authorizing:github', '*');
        })();
      `;

      return new Response(
        `<!doctype html><html><body><script>${script}</script></body></html>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    return new Response("Decap CMS OAuth provider — /auth و /callback فقط", { status: 200 });
  },
};
