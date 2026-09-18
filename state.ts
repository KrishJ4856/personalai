import { readFileSync, writeFileSync } from "fs"
import { execSync } from "child_process"

export const stateFilePath = "~/.local/share/sentientos/state.json"

export function setInitialState(){
    execSync()
}

export function updateWhatsappRowId(rowId: number){
    const data = readFileSync(stateFilePath)
    const config = JSON.parse(data)
    if(!config.whatsapp){
        config.whatsapp = {}
    }
    config.whatsapp.lastProcessedWaRowId = rowId
    writeFileSync(stateFilePath, JSON.stringify(config, null, 2), "utf8")
    console.log("Successfully saved lastProcessedWaRowId to state.")
}

export function updateWhatsappTime(time: string){
    const data = readFileSync(stateFilePath)
    const config = JSON.parse(data)
    if(!config.whatsapp){
        config.whatsapp = {}
    }
    config.whatsapp.lastProcessedWaTime = time
    writeFileSync(stateFilePath, JSON.stringify(config, null, 2), "utf8")
    console.log("Successfully saved lastProcessedWaTime to state.")
}

export function initialStateSetup(){
    execSync("mkdir -p ~/.local/share/sentientos/state.json")
    execSync("mkdir -p ~/.local/share/sentientos/cycle/whatsapp.json")
    execSync("mkdir -p ~/.local/share/sentientos/AGENTS.md")
}