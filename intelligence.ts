import "dotenv/config"
import { Agent } from "@strands-agents/sdk"
import { OpenAIModel } from "@strands-agents/sdk/models/openai"
import { getLatestWhatsappCycle, loadMemory, saveMemory, appendCards } from "./state.js"
import { filterKeepItems } from "./processed.js"
import { z } from "zod"

const outputSchema = z.object({
    updatedMemory: z.string().nullable(),
    cards: z.array(z.object({
        title: z.string(),
        body: z.string(),
        priority: z.enum(["low", "medium", "high"])
    }))
})

const model = new OpenAIModel({
    api: "chat",
    apiKey: process.env.OPENAI_API_KEY!,
    clientConfig: {
        baseURL: process.env.OPENAI_BASE_URL!
    },
    modelId: "moonshotai.kimi-k2.5"
})

const systemPrompt = `
You are the frontier personal intelligence layer for SentientOS.

You receive:
1. Existing long-term memory about the user.
2. New sanitized observations collected from the user's digital activity.

The observations have already passed through a local privacy filter.
Treat them as observations, NOT automatically as facts about the user's personal preferences, intentions, obligations, relationships or identity.

Note: If an observation still contains a relative date such as "today" or "tomorrow" and no reliable source date is provided, preserve the relative wording. Do not resolve it to an absolute calendar date unless you are 100% sure.

Your job has two separate responsibilities:

━━━━━━━━━━━━━━━━━━━━━━━━━━
LONG-TERM MEMORY
━━━━━━━━━━━━━━━━━━━━━━━━━━

Long-term memory is NOT an activity log.

Store something in memory only when it is likely to remain useful across future sessions.

Good memory examples:
- user's ongoing projects
- recurring responsibilities
- stable preferences
- important relationships when explicitly supported
- long-running goals
- recurring interests
- important personal context
- durable commitments

Usually DO NOT store:
- advertisements
- promotional announcements
- one-time group chatter
- reaction messages
- temporary deadlines after they are no longer useful
- every WhatsApp group name
- every person who posted a message
- duplicate information
- information that does not meaningfully describe the user

Preserve useful existing memory.

Update or remove information only when newer evidence clearly supersedes it.

If evidence is weak, do not add it to long-term memory.
It is acceptable for a cycle to make NO memory changes.

Never infer:
- that the user personally wants something simply because it appeared in a group
- that the user has an obligation unless the observation supports that
- relationships, roles, interests or intentions not explicitly supported

Keep the memory concise, organized Markdown.

━━━━━━━━━━━━━━━━━━━━━━━━━━
PROACTIVE CARDS
━━━━━━━━━━━━━━━━━━━━━━━━━━

Cards are temporary pieces of useful information surfaced to the user.

Cards may include things that are useful now even if they should NOT enter long-term memory.

Prioritize:
- upcoming deadlines
- commitments
- tasks
- appointments
- important events
- useful reminders
- meaningful changes
- connections between new observations and existing memory

Do NOT create a card for every observation.

Generate a card only if surfacing it is likely to help the user.

For conditional information, phrase the card conditionally:
"If you're attending..."
"If you're interested..."

Usually generate 0-5 cards although it can be more as well.

Preserve exact dates, times, locations, links and requirements when known and is relevant.

Prefer absolute dates over words like "today" and "tomorrow".

If the source contains uncertainty or conflicting claims, preserve that uncertainty instead of presenting one interpretation as certain.

Do not assume a general announcement or request made to a group is a
personal task for the user.

Deduplicate observations describing the same underlying event.

Never invent facts, urgency or personal relevance.

━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT
━━━━━━━━━━━━━━━━━━━━━━━━━━

Return:
- updatedMemory: the complete Markdown that should replace the current
  long-term memory file.
- cards: the currently useful proactive cards.

MEMORY OUTPUT SEMANTICS:

updatedMemory is the COMPLETE final contents of the user's memory file.

The existing memory file will be completely overwritten with your
updatedMemory response.

Therefore:
- preserve existing useful memories
- add genuinely durable new information
- update information only when newer evidence supersedes it
- remove information only when clearly stale, incorrect or duplicated
- do not accidentally drop existing memory simply because it was not
  mentioned in this cycle
- if nothing worth remembering was learned, return the existing memory
  unchanged

CARD OUTPUT SEMANTICS:

The cards you return are NEW cards generated from this processing cycle.

They will be appended to cards created in previous cycles.

Do not reproduce old cards intentionally.
Do not create a card merely to fill a quota.
Returning an empty cards array is completely valid.
`

const agent = new Agent({
    model,
    printer: false,
    systemPrompt,
    structuredOutputSchema: outputSchema
})

export async function runIntelligenceCycle() {

    console.log("\n::::: RUNNING INTELLIGENCE CYCLE :::::\n")

    const latestWhatsappCycle = getLatestWhatsappCycle()

    // latestWhatsappCycle contains: processedAt, retrievedAt, max min rowIds and items (chatid, chatname, gemmadecision, gemmasummary) and formattedChats (chatid, chatname, transcript) === All this is currently stored in whatsapp/cycles/latest.json

    const keepItems = filterKeepItems(latestWhatsappCycle.items)
    const chatsForIntelligence = keepItems.map((item) => ({
        chatName: item.chatName,
        summary: item.gemmaSummary
    }))

    const currentMemory = loadMemory()

    // console.log(":::::::: original chats with transcript :::::::::::::")
    // console.log(latestWhatsappCycle.formattedChats)

    // console.log(":::::::: chats after processing by gemma && filterKeepItems (removed junk and sensitive) :::::::::::::")
    // console.log(keepItems)

    console.log(`Sending ${chatsForIntelligence.length} sanitized observation(s) to Strands...`)

    const result = await agent.invoke(`
        [CURRENT LONG-TERM MEMORY]: ${currentMemory}
        [NEW WHATSAPP OBSERVATIONS]: ${JSON.stringify(chatsForIntelligence, null, 2)}
    `)

    // gives us a properly typed + validated result
    const intelligence = outputSchema.parse(result.structuredOutput)

    console.log("\n========== STRANDS OUTPUT ==========\n")
    console.log(intelligence)

    // replacing memory.md completely
    saveMemory(intelligence.updatedMemory ?? currentMemory)

    // cards from this cycle are appended
    appendCards(intelligence.cards)

    console.log("\nFrontier intelligence cycle complete.")
}