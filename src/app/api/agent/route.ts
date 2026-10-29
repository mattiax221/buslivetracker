import { NextResponse } from "next/server";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Built-in intelligent transit knowledge for Turin commuters (works 100% free without API keys)
function generateLocalTransitAnswer(query: string, alerts: any[]): string {
  const q = query.toLowerCase().trim();

  // 1. Scioperi e avvisi
  if (q.includes("sciopero") || q.includes("scioperi") || q.includes("agitazione")) {
    const strikes = alerts.filter(
      (a) =>
        a.cause?.includes("Sciopero") ||
        a.header?.toLowerCase().includes("sciopero")
    );
    if (strikes.length > 0) {
      const strikeDetails = strikes
        .slice(0, 3)
        .map((s) => `• **${s.header}**: ${s.description.slice(0, 120)}...`)
        .join("\n");
      return `📢 **Attenzione agli scioperi**: sono presenti ${strikes.length} comunicazioni di sciopero o agitazione per GTT:\n\n${strikeDetails}\n\nPuoi consultare tutti i dettagli completi nella sezione **Avvisi**.`;
    }
    return `✅ **Nessuno sciopero in corso**: al momento non risultano scioperi proclamati per la rete urbana e suburbana GTT di Torino. Il servizio segue la normale programmazione feriale/festiva.`;
  }

  // 2. Deviazioni generali
  if (q.includes("deviazion") || q.includes("lavori") || q.includes("interruz")) {
    const detours = alerts.filter(
      (a) =>
        a.effect?.includes("Deviazione") ||
        a.header?.toLowerCase().includes("deviat")
    );
    return `🚧 Ci sono attualmente **${detours.length} deviazioni** per cantieri, manifestazioni o mercati a Torino. Usa la sezione **Avvisi** in alto per cercare la tua linea specifica.`;
  }

  // 3. Linea specifica (es. "dimmi del 4", "linea 77")
  const lineMatch = q.match(/(?:linea|bus|tram)\s*([0-9]{1,3}[a-z\/]?)/i);
  if (lineMatch) {
    const lineNum = lineMatch[1].toUpperCase();
    const lineAlerts = alerts.filter(
      (a) =>
        a.routes?.includes(lineNum) ||
        a.header?.toLowerCase().includes(`linea ${lineNum.toLowerCase()}`)
    );

    let alertNotice = "";
    if (lineAlerts.length > 0) {
      alertNotice = `\n\n⚠️ **Avviso attivo**: ${lineAlerts[0].header} (${lineAlerts[0].description.slice(0, 100)}...)`;
    }

    if (["3", "4", "7", "9", "10", "13", "15", "16CD", "16CS"].includes(lineNum)) {
      return `🚋 **Tram Linea ${lineNum}**: è una linea tranviaria fondamentale di Torino. È attiva e monitorata con satellitare GPS live sulla mappa.${alertNotice}`;
    }
    if (lineNum === "77") {
      return `🚌 **Linea 77 (Venaria - Corso Cadore)**: gestita nell'ambito del Lotto 2 subaffidato. Non sempre trasmette il segnale GPS continuo, ma le fermate e gli orari sono regolarmente attivi.${alertNotice}`;
    }
    return `🚌 **Linea ${lineNum}**: puoi selezionarla direttamente dalla barra di ricerca in alto per vedere tutti i mezzi in transito sulla mappa e le paline servite.${alertNotice}`;
  }

  // 4. Tratte comuni per pendolari a Torino
  if (q.includes("allianz") || q.includes("juventus") || q.includes("stadio")) {
    return `🏟️ **Per l'Allianz Stadium**: puoi prendere il tram **9B** (speciale partite/eventi) da Piazza Bernini (collegato con Metro M1), oppure il bus **72** o **72/** da Porta Susa / Via Cernaia.`;
  }

  if (q.includes("politecnico") || q.includes("poli")) {
    return `🎓 **Per il Politecnico di Torino (C.so Duca degli Abruzzi)**: le linee principali sono il tram **10** (da Porta Susa e Caio Mario) e i bus **33**, **58** e **58/**.`;
  }

  if (q.includes("porta nuova") && q.includes("porta susa")) {
    return `🚆 **Da Porta Nuova a Porta Susa**: il modo più veloce è la **Metropolitana M1** (solo 3 fermate, ~4 minuti). In alternativa in superficie puoi usare il tram **9** o il bus **52**.`;
  }

  if (q.includes("lingotto")) {
    return `🏢 **Per il Lingotto (Fiere / 8 Gallery)**: la soluzione più rapida è la **Metro M1** (direzione Bengasi, fermate *Italia 61* o *Lingotto*). In superficie sono attivi i bus **18**, **17** e **34**.`;
  }

  if (q.includes("molinette") || q.includes("ospedale")) {
    return `🏥 **Per le Molinette e Presidi Ospedalieri (Piazza Carducci)**: usa la **Metro M1** (fermata *Carducci-Molinette*) oppure in superficie i bus **17**, **18**, **45** e **67**.`;
  }

  if (q.includes("aeroporto") || q.includes("caselle")) {
    return `✈️ **Per l'Aeroporto di Caselle**: puoi usare il treno SFM4/SFM7 da Porta Susa/Torino Rebaudengo, oppure la linea bus express Arriva da Porta Nuova/Porta Susa.`;
  }

  // Default response
  return `👋 Ciao! Sono il tuo assistente di viaggio per la rete GTT di Torino.\n\nPosso aiutarti a:\n• Sapere se ci sono **scioperi** o **deviazioni** attive\n• Consigliarti le **linee migliori** per le principali destinazioni (PoliTO, Stazioni, Ospedali, Stadio)\n• Informarti sullo stato delle **linee bus e tram**.\n\nCosa ti serve sapere per il tuo tragitto oggi?`;
}

export async function POST(request: Request) {
  try {
    const { message, line } = await request.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Messaggio mancante" }, { status: 400 });
    }

    // Fetch active alerts for real-time context
    let alerts: any[] = [];
    try {
      const alertsRes = await fetch("http://localhost:3000/api/alerts", {
        next: { revalidate: 60 },
      });
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        alerts = data.alerts || [];
      }
    } catch {
      // Fallback if local fetch fails
    }

    // Check if free Gemini API key is configured in env
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
        const systemPrompt = `Sei l'assistente ufficiale di mobilità urbana per GTT Torino. Rispondi in italiano in modo conciso, pratico e amichevole per pendolari. Conosci bene le linee tram (3, 4, 7, 9, 10, 13, 15, 16CD, 16CS), metro M1 e i bus di Torino. Ci sono ${alerts.length} avvisi attivi al momento.`;

        const geminiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${systemPrompt}\n\nDomanda dell'utente: ${message}` }],
              },
            ],
          }),
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const reply =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) {
            return NextResponse.json({ reply, provider: "gemini-free" });
          }
        }
      } catch (e) {
        console.warn("Gemini call failed, falling back to local transit engine", e);
      }
    }

    // High quality local transit copilot engine (zero cost, 0ms latency)
    const reply = generateLocalTransitAnswer(message, alerts);
    return NextResponse.json({ reply, provider: "local-transit-engine" });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Errore elaborazione assistente", message: err.message },
      { status: 500 }
    );
  }
}

