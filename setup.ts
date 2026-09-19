import { execSync, spawn } from "child_process"

import { ensureAppData } from "./state.js"

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
        const ollama = spawn("ollama", ["serve"], { detached: true, stdio: "ignore" })
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

export async function setup() {
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
    ensureAppData()
}
