/**
 * Cloudflare Pages Function / Worker for R2 Encrypted Blobs
 *
 * Routes:
 * - PUT /api/blobs/:id  -> Stores encrypted blob in Cloudflare R2
 * - GET /api/blobs/:id  -> Returns encrypted blob from Cloudflare R2
 * - DELETE /api/blobs/:id -> Removes blob from Cloudflare R2
 */

interface Env {
  CODESHARE_BUCKET: R2Bucket;
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { params, request, env } = context;
  const id = params.id as string;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing blob ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const bodyText = await request.text();
    // Validate JSON structure
    const parsed = JSON.parse(bodyText);
    if (!parsed.ciphertext || !parsed.iv) {
      return new Response(JSON.stringify({ error: 'Invalid encrypted payload format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If Cloudflare R2 bucket is bound:
    if (env.CODESHARE_BUCKET) {
      await env.CODESHARE_BUCKET.put(`blobs/${id}.json`, bodyText, {
        customMetadata: {
          name: parsed.name || 'attachment',
          type: parsed.type || 'image',
          uploadedAt: parsed.uploadedAt || new Date().toISOString(),
        },
      });
    }

    return new Response(JSON.stringify({ success: true, id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { params, env } = context;
  const id = params.id as string;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing blob ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    if (!env.CODESHARE_BUCKET) {
      return new Response(JSON.stringify({ error: 'R2 bucket not bound' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const object = await env.CODESHARE_BUCKET.get(`blobs/${id}.json`);
    if (!object) {
      return new Response(JSON.stringify({ error: 'Blob not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await object.text();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Fetch failed';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { params, env } = context;
  const id = params.id as string;

  if (!id || !env.CODESHARE_BUCKET) {
    return new Response(JSON.stringify({ success: false }), { status: 400 });
  }

  await env.CODESHARE_BUCKET.delete(`blobs/${id}.json`);
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
