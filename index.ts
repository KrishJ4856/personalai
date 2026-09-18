import ollama from "ollama"
import type { Message } from "ollama"
import { z } from "zod"

import type { WhatsappGemmaItem } from "./processed.js"
import { setup } from "./setup.js"
import { loadState, saveState, saveWhatsappCycle } from "./state.js"
import { getWhatsappCycle } from "./whatsapp.js"

const LocalTriageSchema = z.object({
    decision: z.enum(["keep", "junk", "sensitive"]),
    reason: z.string(),
    summary: z.string().nullable()
})

async function askGemma(messages: Message[]) {
    const response = await ollama.chat({
        model: "gemma4:e2b",
        messages,
        format: z.toJSONSchema(LocalTriageSchema),
        options: {
            temperature: 0
        },
        stream: false,
        keep_alive: "30m"
    })

    // response.message is an object containing role: assistant, content and thinking
    // so we remove the thinking and return it back

    return LocalTriageSchema.parse(
        JSON.parse(response.message.content)
    )
}

async function main() {
    await setup()

    const state = loadState()

    const { cycleUpperBoundRowId, chats } = getWhatsappCycle(state.whatsapp)
    const retrievedAt = new Date().toISOString()

    // ollama server is running (serveOllama) and Gemma is also installed by now...
    console.log("Starting convo with gemma...")

    // system prompt with role and content
    const systemPrompt = {
        role: "system",
        content:
        `You will be provided with one WhatsApp chat. 
        
        The chat contains: 
        - chatId
        - chatName
        - transcript (this contains a part of the conversation that happened in the chat)
        
        Inside the transcript, each message is written like:
        [[Sender Name | 2026-09-18 09:32:15 +05:30]]: message
        
        Messages sent by the user are marked:
        [[Me | timestamp]]

        Every WhatsApp message includes the local timestamp at which it was sent.
        Interpret relative dates and times such as today, tomorrow, yesterday, and next Friday relative to that message timestamp.
        When the timestamp and context support it, convert relative temporal information into an explicit absolute date in KEEP summaries while preserving the originally stated time.
        Try to not leave a relative date such as "today", "tomorrow" when it can be safely converted into an absolute calendar date. But incase when the relative expression cannot be resolved safely from the message timestamp and context, then you can keep the relative date instead of inventing some absolute date just for the sake of it.

        You are the local privacy and compression layer.

        Be conservative about discarding information.

        Rules:
        - Mark JUNK only when the content is clearly meaningless or low-value noise.
        - Mark SENSITIVE only when the entire content/transcript contains sensitive data, meaning the data that should not be retained or sent to a cloud model. You should mark SENSITIVE only when the useful meaning of the chat cannot be retained
        without retaining the sensitive information.
        - If a part of the transcript could be useful later, mark KEEP. If you clearly see that there is absolutely no meaningful content conveyed by the transcript, mark as JUNK.
        - For KEEP, write a short factual summary preserving important details.
        - Do not infer missing context, identities, relationships, ownership, intentions, or facts that are not explicitly supported by the transcript.
        - Never include sensitive personal data in either the summary OR the reason.
        - Sensitive data includes phone numbers, passwords, PINs, OTPs, CVVs, card numbers, bank account details, government ID numbers, authentication tokens, and similar credentials/private identifiers.
        - If a chat contains both useful information and sensitive information: KEEP the chat, preserve the useful information, and completely omit the sensitive details from the summary and reason. You can signal what that sensitive information was about in the summary if it would be good to state it to add to the context in the summary but dont mention the actual sensitive values.
        - Do not replace sensitive information with partially visible versions. Simply omit it.

        Additional rules for KEEP summaries:
        - Preserve ALL explicitly stated actionable or time-sensitive information.
        - Especially preserve exact: dates, times, deadlines, commitments, event names, locations, amounts, requirements, actionable statements, conditions and links unless they are sensitive.
        - Do not replace an exact actionable detail with some shortened or vague phrase
        - When several independent useful facts exist, preserve each one. Compression should remove unnecessary wording, not useful facts.
        - If there are uncertain or conflicting claims, preserve them.
        `
    }

    const gemmaOutput: WhatsappGemmaItem[] = []

    let index = -1
    for (const chat of chats) {
        console.log(`Processing chat ${++index} - ${chat.chatName}`)

        const messages = [
            systemPrompt,
            { 
                role: "user",
                content: `
                    Chat ID: ${chat.chatId},
                    Chat Name: ${chat.chatName},
                    Transcript: ${chat.transcript}
                `
            }
        ]

        const start = Date.now()

        const response = await askGemma(messages)

        console.log(`Finished in ${((Date.now() - start) / 1000).toFixed(1)}s`)

        gemmaOutput.push({
            chatId: chat.chatId,
            chatName: chat.chatName,
            gemmaDecision: response.decision,
            gemmaReason: response.reason,
            gemmaSummary: response.summary
        })
    }

    console.log("========= GEMMA FINAL OUTPUT: ==========")
    console.log(gemmaOutput)

    const processedAt = new Date().toISOString()

    saveWhatsappCycle({
        source: "whatsapp",
        retrievedAt,
        processedAt,
        previousProcessedRowId: state.whatsapp.lastProcessedRowId,
        throughRowId: cycleUpperBoundRowId,
        items: gemmaOutput
    })

    saveState({
        ...state,
        whatsapp: {
            initialized: true,
            lastProcessedRowId: cycleUpperBoundRowId,
            lastProcessedAt: processedAt
        }
    })
}

main().catch((error) => {
    console.error("WhatsApp processing cycle failed:", error)
    process.exitCode = 1
})
