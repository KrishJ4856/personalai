import { config } from "dotenv"
import path from "node:path"
import { fileURLToPath } from "node:url"

// Resolve from this module, not the terminal's current working directory.
config({
    path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".env"),
    quiet: true
})
