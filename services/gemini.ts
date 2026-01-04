// Client-side streaming helper that posts to our /api/genai proxy and
// streams NDJSON lines to a provided callback.

export type StreamMessageHandler = (event: any) => void
export type StreamDoneHandler = () => void

export async function streamToGenAIProxy(
  payload: Record<string, any>,
  onMessage: StreamMessageHandler,
  onDone?: StreamDoneHandler
) {
  // Ensure the proxy returns stream=true
  const body = { ...payload, stream: true }

  const res = await fetch('/api/genai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`GenAI proxy responded with status ${res.status}: ${text}`)
  }

  if (!res.body) {
    throw new Error('No streaming body in response')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (!value) continue
      buffer += decoder.decode(value, { stream: true })

      // Split on newlines to get NDJSON lines. Keep any partial line in buffer.
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          const parsed = JSON.parse(trimmed)
          onMessage(parsed)
        } catch (e) {
          // Not JSON — forward raw chunk
          onMessage({ type: 'chunk', text: trimmed })
        }
      }
    }

    // If anything left in buffer when stream ends, try to parse it.
    if (buffer.trim()) {
      try {
        onMessage(JSON.parse(buffer))
      } catch {
        onMessage({ type: 'chunk', text: buffer })
      }
    }

    onDone?.()
  } finally {
    try { await reader.cancel() } catch {} // ensure reader closed
  }
}
