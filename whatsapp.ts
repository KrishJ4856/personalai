import Database from "better-sqlite3"
import os from "os"
import path from "path"

// open wacli.db in read only mode. 
// this is stored at ~/.local/state/wacli/
// which contains: HEARTBEAT LOCK session.db wacli.db wacli.db-shm wacli.db-wal

function getWhatsappMessagesSince() {

    // forming dbPath and creating a db using better-sqlite3
    const dbPath = path.join(os.homedir(), ".local", "state", "wacli", "wacli.db")
    const db = new Database(dbPath, { readonly: true })

    // forming midnight today unix timestamp
    const midnightToday = new Date()
    midnightToday.setHours(0, 0, 0, 0)
    const unixTime = Math.floor(midnightToday.getTime() / 1000)

    // running sql command
    const query = db.prepare(`
        SELECT rowid, chat_jid, chat_name, msg_id, sender_jid, sender_name, ts, from_me, text, display_text
        FROM messages
        WHERE ts >= ?
        AND deleted_at IS NULL
        ORDER BY ts ASC    
    `)

    const messages = query.all(unixTime)
    db.close()

    // normalize messages[] by passing every item in normalizeMessage() fn
    const normalizedMessages = messages.map(message => normalizeMessage(message))

    return normalizedMessages
}

function normalizeMessage(message) {
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

function groupByChatId(messages) {
    return Object.groupBy(messages, (message) => message.chatId);
}

export function getFormattedWhatsappChats() {
    // get the normalized messages
    const messages = getWhatsappMessagesSince()

    const lastProcessedWaRowId = messages[messages.length - 1].rowId

    // group messages by chat id
    // Object.entries returns an array of arrays where each inner array[0] will be the chatId and index[1] will be the array of all messages in this chat
    // eg: [
    //       [ '120363297755465503@g.us', [ [Object], [Object] ] ],
    //       [ '120363248684532461@newsletter', [ [Object] ] ],
    //     ]
    const groupedMessages = Object.entries(groupByChatId(messages))

    // print it in the console
    // for (const [chatId, messages] of groupedMessages) {
    //     const chatName = messages[messages.length - 1].chatName ?? "Unknown Chat"
    //     console.log(`Messages in Chat: ${chatName} (${chatId})\n`)

    //     for (const message of messages) {
    //         const sender = message.fromMe ? "Me" : (message.senderName ?? message.chatName ?? "Unknown")
    //         console.log(`[[${sender}]]: ${message.content}`)
    //     }

    //     console.log("\n==============\n")
    // }

    return groupedMessages.map(([chatId, messages]) => {

        const chatName = messages[messages.length - 1].chatName ?? "Unknown Chat"

        const transcript = messages?.map((message) => {
            const sender = message.fromMe ? "Me" : (message.senderName ?? message.chatName ?? "Unknown")
            return `[[${sender}]]: ${message.content}`
        }).join("\n")

        return {
            chatId,
            chatName,
            transcript
        }
    })
}

// const chats = getFormattedWhatsappChats()
// console.log(chats)