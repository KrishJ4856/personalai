import "./env.ts"
import { McpClient } from "@strands-agents/sdk"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

if (!process.env.NOVA_ACT_API_KEY) {
    throw new Error(
        "NOVA_ACT_API_KEY is missing from .env"
    )
}

const childEnv = Object.fromEntries(
    Object.entries(process.env).filter(
        (entry): entry is [string, string] =>
            typeof entry[1] === "string"
    )
)

childEnv.NOVA_ACT_BROWSER_ARGS = "--window-size=1600,900 --class=NovaActBrowser"

export const novaAct = new McpClient({
    transport: new StdioClientTransport({
        command: "uvx",
        args: [
            "--refresh",
            "--with",
            "botocore[crt]",
            "amazon-nova-act-mcp"
        ],
        env: childEnv
    })
})
