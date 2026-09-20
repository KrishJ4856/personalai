import { tool } from "@strands-agents/sdk"
import { randomUUID } from "node:crypto"
import { writeFileSync } from "node:fs"
import { z } from "zod"
import {
    appendCards,
    cardsFilePath,
    loadCards,
    loadMemory,
    saveMemory
} from "./state.ts"

const getCurrentDateTime = tool({
    name: "get_current_date_time",
    description: "Get the current date and time",
    inputSchema: z.object({}),
    callback: () => new Date().toString()
})

const listCards = tool({
    name: "list_cards",
    description: "Get all the cards stored at: ~/.local/share/sentientos/cards/latest.json",
    inputSchema: z.object({}),
    callback: () => loadCards()
})

const addCard = tool({
    name: "add_card",
    description: "Adds a card to the list of cards stored at: ~/.local/share/sentientos/cards/latest.json",
    inputSchema: z.object({
        title: z.string().trim().min(1),
        body: z.string(),
        priority: z.enum(["low", "medium", "high"])
    }),
    callback: ({ title, body, priority }) => {
        const card = {
            id: randomUUID(),
            createdAt: new Date().toISOString(),
            title,
            body,
            priority
        }

        appendCards([card])

        return card
    }
})

const removeCard = tool({
    name: "remove_card",
    description: "Removes a card by id from the list of cards stored at: ~/.local/share/sentientos/cards/latest.json",
    inputSchema: z.object({
        id: z.string().trim().min(1)
    }),
    callback: ({ id }) => {
        const cards = loadCards()
        const updatedCards = cards.filter((card) => card.id !== id)

        if (updatedCards.length === cards.length) {
            throw new Error(`Card with id "${id}" was not found.`)
        }

        writeFileSync(
            cardsFilePath,
            JSON.stringify(updatedCards, null, 2),
            "utf8"
        )

        return { id, removed: true }
    }
})

const showMemory = tool({
    name: "show_memory",
    description: "Get the user long term memory (content of the memory.md file stored at: ~/.local/share/sentientos/memory.md)",
    inputSchema: z.object({}),
    callback: () => loadMemory()
})

const modifyMemory = tool({
    name: "modify_memory",
    description: "Completely replaces the content of the user long term memory file stored at: ~/.local/share/sentientos/memory.md",
    inputSchema: z.object({
        content: z.string()
    }),
    callback: ({ content }) => {
        saveMemory(content)

        return { updated: true }
    }
})

export {
    getCurrentDateTime,
    listCards,
    addCard,
    removeCard,
    showMemory,
    modifyMemory
}
