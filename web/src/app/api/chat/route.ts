import { createClient } from '@/utils/supabase/server'
import { createGroq } from '@ai-sdk/groq'
import { streamText, tool } from 'ai'
import { z } from 'zod'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (!user || error) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { messages } = await req.json()

  const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
  })

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    messages,
    system: `You are HackBot, the AI assistant inside HackAlert, a hackathon and cybersecurity platform.
Goals:
- Help users discover hackathons, choose which to join, prepare project ideas, form teams, and plan registrations.
- Prefer the provided live HackAlert data over general knowledge.
- Personalize advice using the user's skills and profile.
- Be practical: include event name, date, mode, location, and website when recommending hackathons.
- If data is missing, say what is missing instead of inventing facts.
- For cybersecurity questions, stay defensive and educational.
- Keep answers under 180 words unless the user asks for a detailed plan.`,
    tools: {
      trigger_ui_action: tool({
        description: 'Trigger an action in the user\'s browser UI, like navigating to a page or filtering hackathons.',
        parameters: z.object({
          action: z.enum(['navigate', 'filter']).describe('The action to perform'),
          payload: z.string().describe('The target, e.g., teams, projects, profile, online, offline, hybrid'),
        }),
        execute: async ({ action, payload }) => {
          // In an Agent loop, you could execute backend actions here too.
          // For UI actions, we simply return the payload to the client so it can handle routing.
          return {
            success: true,
            action,
            payload,
            message: `Executed UI action: ${action} to ${payload}`
          }
        },
      }),
      fetch_upcoming_hackathons: tool({
        description: 'Fetch the latest upcoming hackathons from the database.',
        parameters: z.object({
          limit: z.number().optional().default(5).describe('Number of hackathons to return')
        }),
        execute: async ({ limit }) => {
          const supabase = await createClient()
          const { data, error } = await supabase
            .from('indian_hackathons')
            .select('*')
            .limit(limit)
          
          if (error) {
            return { error: 'Failed to fetch hackathons' }
          }
          return { hackathons: data || [] }
        }
      })
    },
    maxSteps: 3, // Enable multi-step agent loop
  })

  return result.toDataStreamResponse()
}
