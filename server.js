require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const validator = require("validator");
const OpenAI = require("openai");

const app = express();
const PORT = 3000;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

console.log("API Key loaded:", !!process.env.OPENAI_API_KEY);

// Basic security headers
app.use(helmet());

// CORS: aktuell lokal erlauben
app.use(
  cors({
    origin: ["http://127.0.0.1:5500", "http://localhost:5500"],
  }),
);

// Body size limit
app.use(express.json({ limit: "10kb" }));

// Rate limit gegen Spam
const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    error: "Zu viele Anfragen. Bitte versuchen Sie es gleich erneut.",
  },
});

function cleanText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

app.get("/", (req, res) => {
  res.send("Hello from my server");
});

app.post("/analyze", analyzeLimiter, async (req, res) => {
  const name = cleanText(req.body.name);
  const email = cleanText(req.body.email);
  const website = cleanText(req.body.website);
  const company = cleanText(req.body.company);
  const subject = cleanText(req.body.subject);
  const message = cleanText(req.body.message);

  // Pflichtfelder prüfen
  if (
    !name ||
    !email ||
    !subject ||
    !message ||
    subject === "Bitte auswählen"
  ) {
    return res.status(400).json({
      error: "Bitte füllen Sie alle Pflichtfelder aus.",
    });
  }

  //Name prüfen
  if (!/^[a-zA-ZäöüÄÖÜß\s\-]{2,}$/.test(name)) {
  return res.status(400).json({
    error: "Bitte geben Sie einen gültigen Namen ein.",
  });
}

  // E-Mail prüfen
  if (!validator.isEmail(email)) {
    return res.status(400).json({
      error: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
    });
  }

  // Länge begrenzen
  if (message.length < 10) {
    return res.status(400).json({
      error: "Die Beschreibung ist zu kurz.",
    });
  }

  if (message.length > 800) {
    return res.status(400).json({
      error: "Die Beschreibung ist zu lang. Maximal 800 Zeichen.",
    });
  }

  if (name.length > 100 || company.length > 100 || website.length > 150) {
    return res.status(400).json({
      error: "Einige Eingaben sind zu lang.",
    });
  }

  // Website optional prüfen
  if (website && !validator.isURL(website, { require_protocol: false })) {
    return res.status(400).json({
      error: "Bitte geben Sie eine gültige Website ein.",
    });
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You classify contact inquiries for HEVAL – IT Services & Automation.

HEVAL stands for:
- clear communication
- practical solutions
- no unnecessary marketing language
- structured and efficient work

Allowed categories:
- website_new
- website_redesign
- website_maintenance
- hosting_domain
- automation_ai
- technical_support
- pricing_offer
- consultation
- legal_privacy
- other

Allowed priorities:
- high
- medium
- low

Allowed leadTypes:
- hot_lead
- warm_lead
- cold_lead
- support_request
- offer
- application
- unclear

Rules:
- hot_lead: clear buying intent
- support_request: technical problem
- high priority: urgent or blocking issue
- medium: important but not urgent
- low: general inquiry

Style for reply Options:
- German
- professional, clear, direct
- not too friendly, not salesy
- no fluff, no generic phrases
- actionable
- concrete
- minimal

Return ONLY valid JSON in this exact format:

{
  "category": "one allowed category",
  "priority": "low | medium | high",
  "leadType": "one allowed leadType",
  "replyOption1": "short professional reply in German",
  "replyOption2": "alternative short professional reply in German with a slightly different tone"
}
`,
        },
        {
          role: "user",
          content: `
Kontaktanfrage:

Name: ${name}
E-Mail: ${email}
Website: ${website || "nicht angegeben"}
Unternehmen: ${company || "nicht angegeben"}
Thema: ${subject}
Nachricht: ${message}
`,
        },
      ],
    });

    const text = completion.choices[0].message.content;

    // JSON parsen
    const parsed = JSON.parse(text);

    res.json(parsed);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
