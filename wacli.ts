import { execSync, spawn, spawnSync } from "child_process";
import * as path from "path"
import * as os from "os"
import * as fs from "fs"

function isHomebrewInstalled() {
    try {
        execSync("command -v brew", { stdio: "ignore" })
        return true
    } catch (error) {
        return false
    }
}

function isWacliInstalled() {
    try {
        execSync("command -v wacli", { stdio: "ignore" })
        return true
    } catch (error) {
        return false
    }
}

function installWacli() {
    try {
        execSync("brew install openclaw/tap/wacli", { stdio: "inherit" })
        if (isWacliInstalled()) {
            console.log("Congrats, WaCLI has been installed!")
        } else {
            console.log("wacli cannot be installed even after running: brew install openclaw/tap/wacli")
        }
    } catch (error) {
        console.error("Error in installWacli - ", error)
    }
}

function isWacliAuthenticated() {
    try {
        const result = execSync("wacli auth status --read-only --json")
        const parsed = JSON.parse(result.toString())
        if (parsed.success && parsed.data.authenticated) {
            console.log(`WaCLI is authenticated with phone: ${parsed.data.phone}`)
            return true
        } else {
            console.log("WaCLI is not authenticated...")
            return false
        }
    } catch (error) {
        console.error("Error in isWacliAuthenticated - ", error)
        return false
    }
}

function authenticateWacli() {
    try {
        const result = spawnSync("wacli", ["auth"], { stdio: "inherit" })

        if(result.status !== 0){
            throw new Error(`wacli auth exited with status ${result.status}`)
        }
    } catch (error) {
        console.error("Error in authenticateWacli - ", error)
        throw error
    }
}

function daemonForWacliSync() {
    try {
        const homedir = os.homedir()
        const serviceDir = path.join(homedir, ".config/systemd/user")
        const servicePath = path.join(serviceDir, "wacli-sync.service")
        const serviceName = "wacli-sync.service"

        // getting location for where wacli command is stored in the system
        const pathForWacliBuffer = execSync("type -p wacli")

        const serviceContent = `
[Unit]
Description=WaCLI Sync Follow Service
After=network-online.target

[Service]
ExecStart=${pathForWacliBuffer.toString().trim()} sync --follow --max-reconnect 0 --presence-mode quiet
Restart=always
RestartSec=60

[Install]
WantedBy=default.target
`
        if (fs.existsSync(servicePath)) {
            const currentStatus = spawnSync("systemctl", ["--user", "is-active", serviceName])
            if (currentStatus.status === 0) {
                console.log("The systemd service for wacli sync --follow is already running.")
                return;
            } else {
                spawnSync("systemctl", ["--user", "enable", "--now", serviceName])
                console.log(`Kickstarted ${serviceName} systemd`)
                return;
            }
        } else {
            console.log(`Creating ${serviceName} systemd`)
            fs.mkdirSync(serviceDir, { recursive: true })
            fs.writeFileSync(servicePath, serviceContent, "utf8")
            spawnSync("systemctl", ["--user", "daemon-reload"])
            spawnSync("systemctl", ["--user", "enable", "--now", serviceName])
            console.log("Daemon created and enabled successfully!")
            return;
        }
    } catch (error) {
        console.error("Error in daemonForWacliSync - ", error)
    }
}

export function setupWacli(){
    console.log("Checking WaCLI setup...")

    if(!isWacliInstalled()){
        console.log("WaCLI is not installed...")
        if(isHomebrewInstalled()){
            console.log("Homebrew found! Installing WaCLI now...")
            installWacli()
        } else {
            throw new Error("Homebrew is not installed on your system. It is needed as we need to install WaCLI. Follow instructions mentioned here to install Homebrew: https://brew.sh/ and then come back again.")
        }
    }

    if(!isWacliInstalled()){
        throw new Error("WaCLI installation failed.")
    }

    if(!isWacliAuthenticated()){
        console.log("Running wacli auth for authentication now...")
        authenticateWacli()
    }

    daemonForWacliSync()

    console.log("WaCLI setup complete!")
}

setupWacli()