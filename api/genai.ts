import type { NextApiRequest, NextApiResponse } from 'next'

// A simple streaming proxy for GenAI providers. It accepts JSON POSTs and
// proxies to the provider configured via environment variables. If the
// incoming request includes `stream: true`, the proxy streams the provider's
// response back to the client as NDJSON/passthrough streaming.

const PROVIDER_URL = process.env.GENAI_PROVIDER_URL || process.env.GOOGLE_API_URL || process.env.OPENAI_API_URL
const API_KEY = process.env.GENAI_API_KEY || process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  if (!PROVIDER_URL || !API_KEY) {
    return res.status(500).json({ error: 'GenAI provider URL or API key not configured' })
  }

  try {
    const body = req.body || {}
    const stream = Boolean(body.stream)

    // Build proxy request to provider. We pass through body, but always
    // ensure streaming flag is present when requested.
    const upstreamPayload = {
      ...body,
      stream
    }

    const upstreamRes = await fetch(PROVIDER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify(upstreamPayload)
    })

    if (!upstreamRes.ok) {
      const text = await upstreamRes.text().catch(() => '')
      return res.status(upstreamRes.status).json({ error: 'Upstream error', details: text })
    }

    // If caller didn't request streaming, just forward JSON.
    if (!stream) {
      const json = await upstreamRes.json()
      return res.status(200).json(json)
    }

    // Stream mode: stream response body to client as NDJSON/passthrough
    // Set streaming-friendly headers
    res.setHeader('Content-Type', 'application/x-ndjson')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')

    // In Node (Next.js API routes) we can use the readable stream from the
    // fetch response and pipe chunks to the express-style res.write
    const reader = upstreamRes.body?.getReader()
    if (!reader) {
      // No body to stream
      return res.status(500).json({ error: 'No streaming body from upstream provider' })
    }

    const utf8 = new TextDecoder()

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (value) {
        // Convert chunk to string and write as-is. The provider may already
        // send NDJSON or SSE-like data; we pass through to the client.
        const chunk = utf8.decode(value)
        // Ensure each piece ends with a newline to make downstream parsing easier
        const normalized = chunk.endsWith('\n') ? chunk : chunk + '\n'
        // Write chunk; Node's res.write accepts strings or Buffers
        res.write(normalized)
      }
    }

    // End of stream
    res.end()
  } catch (err: any) {
    console.error('GenAI proxy error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: 'GenAI proxy error', message: String(err?.message || err) })
    } else {
      try { res.end() } catch {} // ignore
    }
  }
}
