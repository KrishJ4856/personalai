Notes: Understanding fns

setup():
- checks and installs ollama if not installed
- if ollama is not running then serves it 
- waits for the ollama server to start
- checks and installs gemma4:e2b if not installed 
- via ensureAppData(): creates `/whatsapp/cycle` in `~/.local/share/sentientos` path if not already present and checks if `state.json` is not present in the path, then creates it and initilizes it with basic json of `whatsapp` object with `initialized: false` and `lastProcessedRowId` and `lastProcessedAt` set to `null`

loadState():
- returns the json data from `~/.local/share/sentientos/state.json`

getWhatsappCycle() [in whatsapp.ts]:
- forms the db path for wacli.db
- creates the db using the path and `Database` from better-sqlite3
- gets the current max row id as `cycleUpperBoundRowId` from wacli.db
- checks state.json to check if initialized is true or not for whatsapp.
- if whatsapp state is not initialized (means cycle is happening for 1st time), then it gets all messages from midnight today till the max row id currently.
- if whatsapp state has been initialized previously (cycle has already ran before), then it gets the lastProcessedRowId from state.json and gets all the messages from the db where rowid is greater than last processed row id and less than the current max row id
- after getting the raw bunch of messages from wacli.db, it normalizes and formats it cleanly and returns it along with the max row id for this cycle.