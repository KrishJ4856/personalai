import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"

export const appDataDirectory = path.join(os.homedir(), ".local", "share", "sentientos")
export const whatsappDataDirectory = path.join(appDataDirectory, "whatsapp")
export const whatsappCycleDirectory = path.join(whatsappDataDirectory, "cycle")
export const stateFilePath = path.join(appDataDirectory, "state.json")
export const latestWhatsappCycleFilePath = path.join(whatsappCycleDirectory, "latest.json")

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

    if (!existsSync(stateFilePath)) {
        saveState(createInitialState())
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
