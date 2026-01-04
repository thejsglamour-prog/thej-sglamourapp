import { streamToGenAIProxy } from './gemini'

export type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function streamChat(
  messages: Message[],
  options: { model?: string } = {},
  onEvent: (event: any) => void
) {
  const payload = {
    model: options.model || 'default',
    messages
  }

  await streamToGenAIProxy(payload, (event) => {
    // Basic normalization: forward events directly. Consumers can inspect
    // event fields (e.g., delta, role, content, done, etc.)
    onEvent(event)
  })
}
