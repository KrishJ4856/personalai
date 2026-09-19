export type GemmaDecision = "keep" | "junk" | "sensitive"

export interface WhatsappGemmaItem {
    chatId: string
    chatName: string
    gemmaDecision: GemmaDecision
    gemmaSummary: string | null
}

export type KeepWhatsappItem = WhatsappGemmaItem & {
    gemmaDecision: "keep"
}

export function filterKeepItems(items: readonly WhatsappGemmaItem[]): KeepWhatsappItem[] {
    return items.filter((item): item is KeepWhatsappItem => item.gemmaDecision === "keep")
}
