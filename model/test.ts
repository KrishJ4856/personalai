// just testing how gemma triages the various edge case whatsapp messages

import ollama from "ollama"
import { z } from "zod"

const tests = [
  {
    name: "Useful + phone number",
    input:
      "Call the electrician tomorrow at 11 AM. His number is 9830012345."
  },

  {
    name: "Useful + card details",
    input:
      "The electricity bill is due tomorrow. Pay it using card 4111111111111111, CVV 321."
  },

  {
    name: "Only sensitive",
    input:
      "My ATM PIN is 4821."
  },

  {
    name: "Important before sensitive",
    input:
      "Your interview is tomorrow at 10 AM. My credit card number is 4111111111111111."
  },

  {
    name: "Sensitive before important",
    input:
      "My Aadhaar number is 1234 5678 9012. Your college registration closes Friday."
  },

  {
    name: "Useful buried in chatter",
    input:
      "Haha okay 😂😂 btw I'll pick you up tomorrow at 5 PM. Send me that meme again."
  },

  {
    name: "Incomplete context",
    input:
      "Don't forget what we discussed yesterday. Do it before 4 PM."
  },

  {
    name: "Potentially relevant promo",
    input:
      "Laptop sale ends tomorrow. Everything is up to 40% off."
  }
]

const LocalTriageSchema = z.object({
  decision: z.enum(["keep", "junk", "sensitive"]),
  reason: z.string(),
  summary: z.string().nullable()
})

const systemPrompt = `
You are the local privacy and compression layer.

Be conservative about discarding information.

Rules:
- Mark JUNK only when the content is clearly meaningless or low-value noise.
- If there is any reasonable chance the content may be useful later, mark KEEP.
- Mark SENSITIVE only when the useful meaning of the entire item should not be retained.

For KEEP:
- write a short factual summary preserving useful information
- do not infer missing context, identities, relationships, ownership or intentions
- omit sensitive information from BOTH the summary and the reason

Sensitive information includes:
- phone numbers
- passwords
- PINs
- OTPs
- CVVs
- credit/debit card numbers
- bank account details
- government ID numbers
- authentication tokens
- similar private credentials or identifiers

If useful and sensitive information appear together:
- KEEP the useful information
- completely omit the sensitive information
- do not partially mask or reproduce the sensitive value

Return structured JSON.
`

async function triage(input: string) {
  const response = await ollama.chat({
    model: "gemma4:e2b",

    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: input
      }
    ],

    format: z.toJSONSchema(LocalTriageSchema),

    options: {
      temperature: 0
    },

    // Keep Gemma loaded in RAM between test cases
    keep_alive: "30m",

    stream: false
  })

  return LocalTriageSchema.parse(
    JSON.parse(response.message.content)
  )
}

async function runTests() {
  for (const test of tests) {
    console.log(`\n========== ${test.name} ==========\n`)
    console.log("INPUT:")
    console.log(test.input)

    const result = await triage(test.input)

    console.log("\nOUTPUT:")
    console.dir(result, { depth: null })
  }
}

runTests()