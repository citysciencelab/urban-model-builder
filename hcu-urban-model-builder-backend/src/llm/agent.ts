import type { Application } from '../declarations.js'
import { callTool, listTools, ToolError } from '../model-tools/index.js'
import type { User } from '../services/users/users.js'
import { streamChatCompletion, type ChatMessage, type ToolSpecification, type Usage } from './openrouter.js'

/** What happens during a turn, reported while it runs so the user can follow it. */
export type AgentEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call'; id: string; name: string; arguments: unknown }
  | { type: 'tool_result'; id: string; name: string; ok: boolean; error?: string }

export type AgentToolCall = { name: string; arguments: unknown; ok: boolean; error?: string }

// Results are fed back to the model; a very large one would crowd out the conversation
const MAX_TOOL_RESULT_LENGTH = 40_000

const toolSpecifications = (): ToolSpecification[] =>
  listTools().map((tool) => ({
    type: 'function',
    function: { name: tool.name, description: tool.description, parameters: tool.inputSchema }
  }))

const readOnlyTools = () =>
  new Set(
    listTools()
      .filter((tool) => tool.readOnly)
      .map((tool) => tool.name)
  )

/**
 * Runs one turn of the chat: calls the model, executes the tools it asks for on behalf of the user, feeds the
 * results back, and repeats until the model answers in text or the iteration limit is reached.
 */
export async function runAgent(options: {
  app: Application
  user: User
  apiKey: string
  model: string
  messages: ChatMessage[]
  signal?: AbortSignal
  onEvent?: (event: AgentEvent) => void
  /** Called once, before the first tool that changes data. */
  beforeFirstWrite?: () => Promise<void>
}) {
  const { app, user, onEvent } = options
  const { openRouterBaseUrl, maxIterations } = app.get('llm')
  const tools = toolSpecifications()
  const readOnly = readOnlyTools()
  const messages = [...options.messages]
  const toolCalls: AgentToolCall[] = []
  const usage: Usage = { promptTokens: 0, completionTokens: 0 }
  let hasWritten = false

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    const answer = await streamChatCompletion({
      baseUrl: openRouterBaseUrl,
      apiKey: options.apiKey,
      model: options.model,
      messages,
      tools,
      signal: options.signal,
      onTextDelta: (text) => onEvent?.({ type: 'text_delta', text })
    })
    usage.promptTokens += answer.usage.promptTokens
    usage.completionTokens += answer.usage.completionTokens

    if (answer.toolCalls.length === 0) {
      return { content: answer.content, toolCalls, usage, iterations: iteration, limitReached: false }
    }

    messages.push({ role: 'assistant', content: answer.content || null, tool_calls: answer.toolCalls })

    for (const call of answer.toolCalls) {
      const name = call.function.name
      let args: unknown
      let result: string
      let error: string | undefined

      try {
        args = call.function.arguments ? JSON.parse(call.function.arguments) : {}
      } catch {
        error = 'The arguments are not valid JSON.'
      }
      onEvent?.({ type: 'tool_call', id: call.id, name, arguments: args })

      if (!error) {
        try {
          if (!readOnly.has(name) && !hasWritten) {
            hasWritten = true
            await options.beforeFirstWrite?.()
          }
          result = JSON.stringify(await callTool(app, user, name, args))
        } catch (toolError) {
          if (!(toolError instanceof ToolError)) {
            throw toolError
          }
          error = `${toolError.code}: ${toolError.message}`
        }
      }

      // the model gets errors as results too, so that it can correct itself
      result = error ? JSON.stringify({ error }) : result!
      if (result.length > MAX_TOOL_RESULT_LENGTH) {
        result = `${result.slice(0, MAX_TOOL_RESULT_LENGTH)}… [truncated, ${result.length} characters in total]`
      }
      messages.push({ role: 'tool', tool_call_id: call.id, content: result })
      toolCalls.push({ name, arguments: args, ok: !error, ...(error ? { error } : {}) })
      onEvent?.({ type: 'tool_result', id: call.id, name, ok: !error, ...(error ? { error } : {}) })
    }
  }

  return { content: '', toolCalls, usage, iterations: maxIterations, limitReached: true }
}
