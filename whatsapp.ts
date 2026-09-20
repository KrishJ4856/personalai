import Database from "better-sqlite3"
import os from "node:os"
import path from "node:path"

import type { WhatsappState } from "./state.js"

interface WhatsappMessageRow {
    rowid: number
    chat_jid: string
    chat_name: string | null
    sender_jid: string | null
    sender_name: string | null
    ts: number
    from_me: number
    text: string | null
    display_text: string | null
}

interface NormalizedWhatsappMessage {
    rowId: number
    chatId: string
    chatName: string | null
    senderId: string | null
    senderName: string | null
    timestamp: number
    fromMe: boolean
    content: string
}

export interface FormattedWhatsappChat {
    chatId: string
    chatName: string
    transcript: string
}

export interface WhatsappCycleBatch {
    cycleUpperBoundRowId: number | null
    chats: FormattedWhatsappChat[]
}

interface MaxRowIdResult {
    cycleUpperBoundRowId: number | null
}

function normalizeMessage(message: WhatsappMessageRow): NormalizedWhatsappMessage {
    return {
        rowId: message.rowid,
        chatId: message.chat_jid,
        chatName: message.chat_name,
        senderId: message.sender_jid,
        senderName: message.sender_name,
        timestamp: message.ts,
        fromMe: Boolean(message.from_me),
        content: message.text ?? message.display_text ?? ""
    }
}

function formatMessageTimestamp(timestamp: number) {
    const date = new Date(timestamp * 1000)
    const pad = (value: number) => String(value).padStart(2, "0")

    const offsetMinutes = -date.getTimezoneOffset()
    const offsetSign = offsetMinutes >= 0 ? "+" : "-"
    const absoluteOffsetMinutes = Math.abs(offsetMinutes)
    const offsetHours = Math.floor(absoluteOffsetMinutes / 60)
    const offsetRemainingMinutes = absoluteOffsetMinutes % 60

    const localDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    const localTime = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    const offset = `${offsetSign}${pad(offsetHours)}:${pad(offsetRemainingMinutes)}`

    return `${localDate} ${localTime} ${offset}`
}

function groupByChatId(messages: NormalizedWhatsappMessage[]) {
    const groupedMessages = new Map<string, NormalizedWhatsappMessage[]>()

    for (const message of messages) {
        const chatMessages = groupedMessages.get(message.chatId) ?? []
        chatMessages.push(message)
        groupedMessages.set(message.chatId, chatMessages)
    }

    return groupedMessages
}

function formatChats(messages: NormalizedWhatsappMessage[]): FormattedWhatsappChat[] {
    return Array.from(groupByChatId(messages), ([chatId, chatMessages]) => {
        const latestMessage = chatMessages[chatMessages.length - 1]
        const chatName = latestMessage?.chatName ?? "Unknown Chat"

        const transcript = chatMessages.map((message) => {
            const sender = message.fromMe ? "Me" : (message.senderName ?? message.chatName ?? "Unknown")
            const timestamp = formatMessageTimestamp(message.timestamp)
            return `[[${sender} | ${timestamp}]]: ${message.content}`
        }).join("\n")

        return {
            chatId,
            chatName,
            transcript
        }
    })
}

export function getWhatsappCycle(state: WhatsappState, since?: Date): WhatsappCycleBatch {
    const dbPath = path.join(os.homedir(), ".local", "state", "wacli", "wacli.db")
    const db = new Database(dbPath, { readonly: true })

    try {
        const { cycleUpperBoundRowId } = db.prepare(`
            SELECT MAX(rowid) AS cycleUpperBoundRowId
            FROM messages
        `).get() as MaxRowIdResult

        let messageRows: WhatsappMessageRow[] = []

        if (cycleUpperBoundRowId !== null) {
            if (since || !state.initialized) {
                const midnightToday = new Date()
                midnightToday.setHours(0, 0, 0, 0)
                const sinceUnixTime = Math.floor((since ?? midnightToday).getTime() / 1000)

                messageRows = db.prepare(`
                    SELECT rowid, chat_jid, chat_name, sender_jid, sender_name, ts, from_me, text, display_text
                    FROM messages
                    WHERE ts >= ?
                    AND rowid <= ?
                    AND deleted_at IS NULL
                    ORDER BY ts ASC, rowid ASC
                `).all(sinceUnixTime, cycleUpperBoundRowId) as WhatsappMessageRow[]
            } else {
                const previousProcessedRowId = state.lastProcessedRowId ?? 0

                messageRows = db.prepare(`
                    SELECT rowid, chat_jid, chat_name, sender_jid, sender_name, ts, from_me, text, display_text
                    FROM messages
                    WHERE rowid > ?
                    AND rowid <= ?
                    AND deleted_at IS NULL
                    ORDER BY ts ASC, rowid ASC
                `).all(previousProcessedRowId, cycleUpperBoundRowId) as WhatsappMessageRow[]
            }
        }

        const messages = messageRows.map(normalizeMessage)

        return {
            cycleUpperBoundRowId,
            chats: formatChats(messages)
        }
    } finally {
        db.close()
    }
}
