/** Messages and tool calls in the format of OpenRouter's (OpenAI-compatible) chat completions API. */
export type ToolCall = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

export type ToolSpecification = {
  type: 'function'
  function: { name: string; description: string; parameters: unknown }
}

export type Usage = { promptTokens: number; completionTokens: number }

export type LlmErrorReason = 'invalid_api_key' | 'insufficient_credits' | 'rate_limited' | 'llm_error'

/** A failed request to the model provider, with a message that can be shown to the user. */
export class LlmError extends Error {
  constructor(
    public reason: LlmErrorReason,
    message: string
  ) {
    super(message)
    this.name = 'LlmError'
  }
}

const describeFailure = (status: number, detail: string): LlmError => {
  if (status === 401 || status === 403) {
    return new LlmError('invalid_api_key', 'OpenRouter did not accept the API key.')
  }
  if (status === 402) {
    return new LlmError('insufficient_credits', 'The OpenRouter account has insufficient credits.')
  }
  if (status === 429) {
    return new LlmError('rate_limited', 'OpenRouter is limiting requests at the moment. Try again shortly.')
  }
  return new LlmError(
    'llm_error',
    `The model could not be reached (${status})${detail ? `: ${detail}` : '.'}`
  )
}

/** The human-readable part of an error response, without anything else the provider may echo back. */
const extractErrorMessage = (body: string) => {
  try {
    const message = JSON.parse(body)?.error?.message
    return typeof message === 'string' ? message.slice(0, 300) : ''
  } catch {
    return ''
  }
}

/**
 * Sends one chat completion request and reads the streamed answer. Text is passed on as it arrives; the
 * complete answer, including the tool calls the model wants to make, is returned at the end.
 */
export async function streamChatCompletion(options: {
  baseUrl: string
  apiKey: string
  model: string
  messages: ChatMessage[]
  tools: ToolSpecification[]
  signal?: AbortSignal
  onTextDelta?: (text: string) => void
}): Promise<{ content: string; toolCalls: ToolCall[]; usage: Usage }> {
  let response: Response
  try {
    response = await fetch(`${options.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
        // tells OpenRouter which application the request comes from
        'X-Title': 'Urban Model Builder'
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        tools: options.tools,
        stream: true,
        usage: { include: true }
      }),
      signal: options.signal
    })
  } catch (error: any) {
    if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
      throw new LlmError('llm_error', 'The model took too long to answer.')
    }
    throw new LlmError('llm_error', 'The model could not be reached.')
  }

  if (!response.ok || !response.body) {
    throw describeFailure(response.status, extractErrorMessage(await response.text().catch(() => '')))
  }

  let content = ''
  const toolCalls: ToolCall[] = []
  const usage: Usage = { promptTokens: 0, completionTokens: 0 }

  const handleEvent = (payload: string) => {
    if (payload === '[DONE]') {
      return
    }
    let chunk: any
    try {
      chunk = JSON.parse(payload)
    } catch {
      return
    }
    if (chunk.error) {
      // providers can fail after the stream has started
      const message = typeof chunk.error.message === 'string' ? chunk.error.message.slice(0, 300) : ''
      throw describeFailure(Number(chunk.error.code) || 500, message)
    }
    if (chunk.usage) {
      usage.promptTokens = chunk.usage.prompt_tokens ?? usage.promptTokens
      usage.completionTokens = chunk.usage.completion_tokens ?? usage.completionTokens
    }
    const delta = chunk.choices?.[0]?.delta
    if (!delta) {
      return
    }
    if (typeof delta.content === 'string' && delta.content) {
      content += delta.content
      options.onTextDelta?.(delta.content)
    }
    // a tool call arrives in pieces: its id and name first, then its arguments bit by bit
    for (const part of delta.tool_calls ?? []) {
      const index = part.index ?? 0
      toolCalls[index] ??= { id: '', type: 'function', function: { name: '', arguments: '' } }
      const call = toolCalls[index]
      if (part.id) call.id = part.id
      if (part.function?.name) call.function.name += part.function.name
      if (part.function?.arguments) call.function.arguments += part.function.arguments
    }
  }

  // Server-sent events: lines "data: <json>", separated by blank lines; other lines are comments
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    for await (const bytes of response.body as unknown as AsyncIterable<Uint8Array>) {
      buffer += decoder.decode(bytes, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.startsWith('data:')) {
          handleEvent(line.slice(5).trim())
        }
      }
    }
    if (buffer.startsWith('data:')) {
      handleEvent(buffer.slice(5).trim())
    }
  } catch (error: any) {
    if (error instanceof LlmError) {
      throw error
    }
    throw new LlmError(
      'llm_error',
      error?.name === 'AbortError' || error?.name === 'TimeoutError'
        ? 'The model took too long to answer.'
        : 'The connection to the model was interrupted.'
    )
  }

  return { content, toolCalls: toolCalls.filter(Boolean), usage }
}
