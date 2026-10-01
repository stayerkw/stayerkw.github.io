// Cloudflare Worker لتفويض GitHub OAuth الخاص بلوحة Decap CMS (نسخة مؤمَّنة — المهمة A2).
// لا يخزن أي بيانات. يبادل "code" بـ access_token ويسلّمه للوحة عبر postMessage.
//
// المتغيرات السرية المطلوبة (npx wrangler secret put <NAME>):
//   GITHUB_CLIENT_ID      معرّف تطبيق OAuth
//   GITHUB_CLIENT_SECRET  سر التطبيق
//   ALLOWED_USERS         أسماء مستخدمي GitHub المسموح لهم، مفصولة بفاصلة: "user1,user2"
//   SITE_ORIGIN           أصل/أصول اللوحة المسموحة، مفصولة بفاصلة (بلا / في النهاية):
//                         "https://stayerkw.github.io" ثم يُضاف النطاق الخاص لاحقاً
// اختياري:
//   GITHUB_SCOPE          الافتراضي "public_repo" (للمستودع العام). استعمل "repo" فقط لمستودع خاص.

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const STATE_COOKIE = "oauth_state";

const csv = (v) => (v || "").split(",").map((s) => s.trim()).filter(Boolean);

function baseHeaders(extra = {}) {
  return {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    ...extra,
  };
}

function text(body, status) {
  return new Response(body, {
    status,
    headers: baseHeaders({
      "Content-Type": "text/plain; charset=utf-8",
      "Set-Cookie": `${STATE_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`,
    }),
  });
}

// يمنع كسر وسم <script> إن ظهر "<" داخل النص
const safeJson = (v) => JSON.stringify(v).replace(/</g, "\\u003c");

function configMissing(env) {
  return (
    !env.GITHUB_CLIENT_ID ||
    !env.GITHUB_CLIENT_SECRET ||
    csv(env.ALLOWED_USERS).length === 0 ||
    csv(env.SITE_ORIGIN).length === 0
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // فشل مغلق: لا تعمل الخدمة بلا قائمة سماح وأصل محدد
    if ((url.pathname === "/auth" || url.pathname === "/callback") && configMissing(env)) {
      return text("Server not configured", 500);
    }

    // 1) بدء الدخول: توليد state وحفظه في كوكي HttpOnly
    if (url.pathname === "/auth") {
      const state = crypto.randomUUID();
      const authorizeUrl = new URL(GITHUB_AUTHORIZE_URL);
      authorizeUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      authorizeUrl.searchParams.set("redirect_uri", `${url.origin}/callback`);
      authorizeUrl.searchParams.set("scope", env.GITHUB_SCOPE || "public_repo");
      authorizeUrl.searchParams.set("state", state);
      return new Response(null, {
        status: 302,
        headers: baseHeaders({
          Location: authorizeUrl.toString(),
          "Set-Cookie": `${STATE_COOKIE}=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
        }),
      });
    }

    // 2) العودة من GitHub
    if (url.pathname === "/callback") {
      // تحقق state (حماية CSRF)
      const cookieState = /(?:^|;\s*)oauth_state=([^;]+)/.exec(request.headers.get("Cookie") || "")?.[1];
      const queryState = url.searchParams.get("state");
      if (!cookieState || !queryState || cookieState !== queryState) {
        return text("Invalid state", 400);
      }

      const code = url.searchParams.get("code");
      if (!code) return text("Missing code", 400);

      let tokenData;
      try {
        const tokenRes = await fetch(GITHUB_TOKEN_URL, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: `${url.origin}/callback`,
          }),
        });
        tokenData = await tokenRes.json();
      } catch {
        return text("OAuth upstream error", 502);
      }
      if (!tokenData || tokenData.error || !tokenData.access_token) {
        return text("OAuth error", 401);
      }

      // قائمة السماح: فقط المستخدمون المصرح لهم
      let login;
      try {
        const me = await fetch(GITHUB_USER_URL, {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "stayerkw-cms-oauth",
          },
        }).then((r) => r.json());
        login = me && me.login;
      } catch {
        return text("OAuth upstream error", 502);
      }
      const allowed = csv(env.ALLOWED_USERS).map((u) => u.toLowerCase());
      if (!login || !allowed.includes(String(login).toLowerCase())) {
        return text("Forbidden", 403);
      }

      const origins = csv(env.SITE_ORIGIN);
      const payload = `authorization:github:success:${JSON.stringify({
        token: tokenData.access_token,
        provider: "github",
      })}`;
      const nonce = crypto.randomUUID().replace(/-/g, "");

      // التوكن لا يُرسل إلا لأصل اللوحة المسموح، ولا يُرسل أبداً بـ '*'
      const html = `<!doctype html><html><body><script nonce="${nonce}">
(function () {
  var ORIGINS = ${safeJson(origins)};
  var MSG = ${safeJson(payload)};
  function receive(e) {
    if (ORIGINS.indexOf(e.origin) === -1) return;
    window.removeEventListener("message", receive, false);
    window.opener.postMessage(MSG, e.origin);
  }
  window.addEventListener("message", receive, false);
  window.opener.postMessage("authorizing:github", "*"); // مصافحة بلا أسرار
})();
</script></body></html>`;

      return new Response(html, {
        headers: baseHeaders({
          "Content-Type": "text/html; charset=utf-8",
          "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'`,
          "Set-Cookie": `${STATE_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`,
        }),
      });
    }

    return new Response("Decap CMS OAuth provider — /auth و /callback فقط", {
      status: 200,
      headers: baseHeaders({ "Content-Type": "text/plain; charset=utf-8" }),
    });
  },
};
