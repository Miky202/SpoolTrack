// SpoolTrack Cloudflare Worker
// Benötigt eine KV-Bindung mit dem Namen SPOOLTRACK_KV.
// Endpoint: GET/POST /spools

const KEY = 'spooltrack:data:v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (!env.SPOOLTRACK_KV) {
      return json({ error: 'KV binding SPOOLTRACK_KV fehlt.' }, 500);
    }

    if (url.pathname !== '/spools') {
      return json({ ok: true, message: 'SpoolTrack API läuft. Nutze /spools.' });
    }

    if (request.method === 'GET') {
      const saved = await env.SPOOLTRACK_KV.get(KEY, { type: 'json' });
      return json(saved || { spools: [], updatedAt: 0, sourceId: 'cloudflare' });
    }

    if (request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'Ungültiges JSON.' }, 400);
      }

      if (!Array.isArray(body.spools)) {
        return json({ error: 'Feld "spools" muss ein Array sein.' }, 400);
      }

      const payload = {
        spools: body.spools,
        updatedAt: Number(body.updatedAt || Date.now()),
        sourceId: String(body.sourceId || 'unknown')
      };

      await env.SPOOLTRACK_KV.put(KEY, JSON.stringify(payload));
      return json({ ok: true, updatedAt: payload.updatedAt });
    }

    return json({ error: 'Methode nicht erlaubt.' }, 405);
  }
};
