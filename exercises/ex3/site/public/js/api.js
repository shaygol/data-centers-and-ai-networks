// Thin client for the Supabase RPC endpoints (no library needed).
(function () {
  const C = window.MH_CONFIG || {};
  const configured = C.SUPABASE_URL && !C.SUPABASE_URL.includes("YOUR-PROJECT") && C.SUPABASE_ANON_KEY && !C.SUPABASE_ANON_KEY.includes("YOUR-");

  async function rpc(fn, args) {
    if (!configured) throw new Error("The site is not connected to its database yet (see js/config.js).");
    const res = await fetch(C.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/rpc/" + fn, {
      method: "POST",
      headers: Object.assign({
        "apikey": C.SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
      }, C.SUPABASE_ANON_KEY.startsWith("eyJ") ? { "Authorization": "Bearer " + C.SUPABASE_ANON_KEY } : {}),
      body: JSON.stringify(args || {})
    });
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }
    if (!res.ok) {
      const msg = (body && (body.message || body.hint)) || ("Request failed (" + res.status + ")");
      throw new Error(msg);
    }
    return body;
  }

  async function hashEmail(email) {
    const data = new TextEncoder().encode("miswire-hunt:" + email.trim().toLowerCase());
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  window.MH = { rpc, hashEmail, store, configured, refreshMs: (C.REFRESH_SECONDS || 10) * 1000 };
})();
