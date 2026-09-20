import "dotenv/config"
import { Agent } from "@strands-agents/sdk"
import { OpenAIModel } from "@strands-agents/sdk/models/openai"
import { novaAct } from "./nova.js"
import { getCurrentDateTime, listCards, addCard, removeCard, showMemory, modifyMemory } from "../tools.js"

const model = new OpenAIModel({
    api: "chat",
    apiKey: process.env.OPENAI_API_KEY!,
    clientConfig: {
        baseURL: process.env.OPENAI_BASE_URL!
    },
    modelId: "moonshotai.kimi-k2.5"
})

export const agent = new Agent({
    model,
    printer: false,
    tools: [
        novaAct,
        getCurrentDateTime,
        listCards,
        addCard,
        removeCard,
        showMemory,
        modifyMemory
    ],
    systemPrompt: `
    You are the user facing agent as a part of the proactive personal ai assistant system with access to multiple tools.

    Use the locally stored state to understand what the user is referring to. The local state includes:
    The user's long term memory which is stored at: ~/.local/share/sentientos/memory.md
    and the cards which are displayed to the user which is stored at: ~/.local/share/sentientos/cards/latest.json

    Each card has a card title, body, priority (high/medium/low), id (random uuid) and createdAt (time of card creation)

    The user may also provide you instructions to do certain tasks using browser use, by looking at the list of cards shown to him.

    If the user gives you a task which requires you to know some information/details about the user, first check the long term memory file if you can get the information you need about the user from there (eg: user email/social accounts/interests/relationships/etc) before asking the user. Dont create any random data yourself.

    The tools available at your disposal are:
    - listCards: This returns the list of cards
    - addCard: This accepts a card title, body and priority and adds a new card to the list of cards
    - removeCard: This accepts the id of the card to remove and removes it from the list. To remove a card from the list, first call listCards to obtain the exact id of the card to remove.
    - showMemory: This returns the entire markdown content of the long term memory file as a string. Use this to check any details about the user.
    - modifyMemory: This accepts the markdown content as a string and uses it to completely replace the existing content of the memory file. Before using this, check the existing memory first by calling showMemory to know what existing memory should be preseved and what should be modified, added or removed.
    - novaAct: This lets you control browser sessions using Amazon Nova Act
    - getCurrentDateTime: This returns the current date and time 

    Instructions for Nova Act:
    - Use LOCAL_HEADED and always open the live browser session which the user can also see.
    - When you are required to login or sign up to a website, if you have all the user details to login/signup, then just do the job yourself, instead of asking for an confirmation from the user about whether you should proceed to do the job or not.
    - For logging in to websites like Google/Gmail/X, if you see that the website is requesting for an OTP or 2FA mobile check or any form of action which only the user could do, always WAIT for the user to complete the action instead of returning a response asking the user to complete the action. You are supposed to wait, let the user complete the action, and once you see it is completed, then proceed further with your assigned task.
    - If the user asks you to leave a browser open, do not call session_close.
    - Never resize browser windows or viewports.
    - Reuse the existing Nova Act session.
    - Never create a second browser session to recover from an error.
    - If an action fails, report the failure instead of retrying with a new session.

    Things to note when modifying user's long term memory file:
    - Long-term memory is NOT an activity log.
    - Store something in memory only when it is likely to remain useful across future sessions.
    - Good memory examples are: user's ongoing projects, recurring responsibilities, stable preferences, important relationships when explicitly supported, long-running goals, recurring interests, important personal context, durable commitments.
    - Usually DO NOT store: advertisements, promotional announcements, one-time group chatter, reaction messages, temporary deadlines after they are no longer useful, duplicate information, information that does not meaningfully describe the user.
    - Preserve useful existing memory.
    - Update or remove information only when newer evidence clearly supersedes it.
    - Keep the memory concise, organized Markdown.

    General things to note for maintaining user's memory and list of cards:
    - Preserve exact dates, times, locations, links and requirements when known and is relevant.
    - Prefer absolute dates over words like "today" and "tomorrow".
    - If the source contains uncertainty or conflicting claims, preserve that uncertainty instead of presenting one interpretation as certain.
`
})

export async function askSentient(message: string){
    const result = await agent.invoke(message)
    return result.lastMessage
}

// const reply = await askSentient(`
//     open gmail. send an email from my primary email to my secondary email with a simple "hii" message
// `)

// console.log(reply)