import { execSync, spawn } from "child_process"
import ollama, { Message } from "ollama"
import { getFormattedWhatsappChats } from "./whatsapp";
import { z } from "zod"

import { initialStateSetup } from "./state.ts"

const LocalTriageSchema = z.object({
    decision: z.enum(["keep", "junk", "sensitive"]),
    reason: z.string(),
    summary: z.string().nullable()
})

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));


function isOllamaInstalled() {
    try {
        execSync("ollama --version", { stdio: "ignore" })
        return true
    } catch (error) {
        return false
    }
}

function checkOllamaVersion() {
    try {
        const version = execSync("ollama --version")
        console.log("Ollama version: ", version.toString())
    } catch (error) {
        console.log("Error in getOllamaVersion - ", error)
    }
}

function installOllama() {
    try {
        if (!isOllamaInstalled()) {
            console.log("Ollama is not installed - Beginning installation...")
            execSync("omarchy pkg add ollama", { stdio: "inherit" })

            if (isOllamaInstalled()) {
                console.log("Congrats - Ollama installed successfully!")
                checkOllamaVersion()
            } else {
                throw new Error("omarchy pkg add ollama command ran but isOmarchyInstalled returns false?!? ")
            }

        } else {
            console.log("Ollama is already installed in your system...")
            checkOllamaVersion()
        }
    } catch (error) {
        console.error("Error in installOllama - ", error)
    }
}

function isOllamaRunning() {
    try {
        execSync("ollama ps", { stdio: "ignore" })
        return true
    } catch (error) {
        return false
    }
}

function serveOllama() {
    try {
        const ollama = spawn("ollama", ["serve"], { detached: true })
        ollama.unref()
    } catch (error) {
        console.error("Error in serveOllama - ", error)
    }
}

function isGemmaInstalled() {
    try {
        execSync("ollama list | grep gemma4:e2b", { stdio: "ignore" })
        console.log("Gemma4:E2B is installed!")
        return true
    } catch (error) {
        console.log("Gemma4:E2B not installed.")
        return false
    }
}

function installGemmaModel() {
    try {
        console.log("Installing Gemma4:E2B model on Ollama without launching it")
        execSync("ollama pull gemma4:e2b", { stdio: "inherit" })
        const output = isGemmaInstalled()
        if (output) return true
        else return false
    } catch (error) {
        console.error("Error in installGemmaModel - ", error)
    }
}

// runs: ollama run gemma4:e2b with stdio: inherit - running gemma in the same terminal interactively (not needed)
function runGemmaModel() {
    try {
        console.log("Running Gemma4:E2B...")
        execSync("ollama run gemma4:e2b", { stdio: "inherit" })
    } catch (error) {
        console.error("Error in runGemmaModel - ", error)
    }
}


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

async function setup() {
    console.log("Setting up Ollama and Gemma4:E2B...")
    installOllama()
    if (!isOllamaRunning()) {
        console.log("Starting Ollama...")
        serveOllama()
    } else console.log("Ollama is already running locally...")
    // wait for ollama server to start
    await sleep(2000)
    if (!isGemmaInstalled()) {
        console.log("Gemma is not installed in this machine...")
        installGemmaModel()
    }

    // initialize local files for storing app state
    initialStateSetup()

    const wachats = getFormattedWhatsappChats()

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
        
        Inside the transcript, each sender is written like: 
        [[Sender Name]]: message
        
        Messages sent by the user are marked:
        [[Me]]

        You are the local privacy and compression layer.

        Be conservative about discarding information.

        Rules:
        - Mark JUNK only when the content is clearly meaningless or low-value noise.
        - Mark SENSITIVE only when the entire content/transcript contains sensitive date, meaning the data that should not be retained or sent to a cloud model. You should mark SENSITIVE only when the useful meaning of the chat cannot be retained
        without retaining the sensitive information.
        - If there is any reasonable chance the content may be useful later, mark KEEP.
        - For KEEP, write a short factual summary preserving important details.
        - Do not infer missing context, identities, relationships, ownership, intentions, or facts that are not explicitly supported by the transcript.
        - Never include sensitive personal data in either the summary OR the reason.
        - Sensitive data includes phone numbers, passwords, PINs, OTPs, CVVs, card numbers, bank account details, government ID numbers, authentication tokens, and similar credentials/private identifiers.
        - If a chat contains both useful information and sensitive information: KEEP the chat, preserve the useful information, and completely omit the sensitive details from the summary and reason. You can signal what that sensitive information was about in the summary if it would be good to state it to add to the context in the summary but dont mention the actual sensitive values.
        - Do not replace sensitive information with partially visible versions. Simply omit it.

        Additional rules for KEEP summaries:
        - Preserve ALL explicitly stated actionable or time-sensitive information.
        - Especially preserve exact: dates, times, deadlines, commitments, event names, locations, amounts, requirements, actionable statements, conditions and links unless they are sensitive.
        - Do not replace an exact actionable detail with some shortened or vague phase
        - When several independent useful facts exist, preserve each one. Compression should remove unnecessary wording, not useful facts.
        `
    }

    const gemmaOutput = []

    let index = -1
    for (const chat of wachats) {
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

    const lastProcessedWaTime = new Date().toISOString()
}

setup()