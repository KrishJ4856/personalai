import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"

export const appDataDirectory = path.join(os.homedir(), ".local", "share", "sentientos")
export const whatsappDataDirectory = path.join(appDataDirectory, "whatsapp")
export const whatsappCycleDirectory = path.join(whatsappDataDirectory, "cycle")
export const stateFilePath = path.join(appDataDirectory, "state.json")
export const latestWhatsappCycleFilePath = path.join(whatsappCycleDirectory, "latest.json")
export const memoryFilePath = path.join(appDataDirectory, "memory.md")
export const cardsDirectory = path.join(appDataDirectory, "cards")
export const cardsFilePath = path.join(cardsDirectory, "latest.json")

export interface Card {
    id: string
    createdAt: string
    title: string
    body: string
    priority: "low" | "medium" | "high"
}

export interface WhatsappState {
    initialized: boolean
    lastProcessedRowId: number | null
    lastProcessedAt: string | null
}

export interface AppState {
    whatsapp: WhatsappState
}

function createInitialState(): AppState {
    return {
        whatsapp: {
            initialized: false,
            lastProcessedRowId: null,
            lastProcessedAt: null
        }
    }
}

export function ensureAppData() {
    mkdirSync(appDataDirectory, { recursive: true })
    mkdirSync(whatsappDataDirectory, { recursive: true })
    mkdirSync(whatsappCycleDirectory, { recursive: true })
    mkdirSync(cardsDirectory, { recursive: true })

    if (!existsSync(stateFilePath)) {
        saveState(createInitialState())
    }

    if (!existsSync(memoryFilePath)) {
        writeFileSync(
            memoryFilePath,
            "# Personal Memory\n\nNo durable memories recorded yet.\n",
            "utf8"
        )
    }

    if (!existsSync(cardsFilePath)) {
        writeFileSync(cardsFilePath, "[]", "utf8")
    }
}

export function loadState(): AppState {
    const data = readFileSync(stateFilePath, "utf8")
    return JSON.parse(data) as AppState
}

export function saveState(state: AppState) {
    writeFileSync(stateFilePath, JSON.stringify(state, null, 2), "utf8")
}

export function saveWhatsappCycle(cycle: unknown) {
    writeFileSync(latestWhatsappCycleFilePath, JSON.stringify(cycle, null, 2), "utf8")
}

export function getLatestWhatsappCycle(){
    const data = readFileSync(latestWhatsappCycleFilePath, "utf8")
    return JSON.parse(data)
}

export function loadMemory(): string {
    return readFileSync(memoryFilePath, "utf8")
}

export function saveMemory(memory: string) {
    writeFileSync(memoryFilePath, memory, "utf8")

    console.log("Updated long-term memory.")
}

export function loadCards(): Card[] {
    if (!existsSync(cardsFilePath)) {
        return []
    }

    const data = readFileSync(cardsFilePath, "utf8")

    return JSON.parse(data) as Card[]
}

export function appendCards(newCards: readonly Card[]) {
    if (newCards.length === 0) {
        console.log("No new cards generated.")
        return
    }

    const existingCards = loadCards()

    const updatedCards = [
        ...existingCards,
        ...newCards
    ]

    writeFileSync(
        cardsFilePath,
        JSON.stringify(updatedCards, null, 2),
        "utf8"
    )

    console.log(`Added ${newCards.length} new card(s).`)
}