// Utilities for Instant Transit Sharing via WhatsApp, Telegram, Native Web Share, & Clipboard

export interface ShareData {
  title: string;
  text: string;
  url: string;
}

export async function shareTransitInfo(data: ShareData): Promise<"native" | "manual"> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: data.title,
        text: data.text,
        url: data.url,
      });
      return "native";
    } catch (err: any) {
      if (err.name === "AbortError") {
        return "native"; // User cancelled native share
      }
    }
  }
  return "manual";
}

export function getWhatsAppShareUrl(data: ShareData): string {
  const fullText = `${data.text}\n\n📍 Segui in tempo reale su GTT Live:\n${data.url}`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;
}

export function getTelegramShareUrl(data: ShareData): string {
  return `https://t.me/share/url?url=${encodeURIComponent(data.url)}&text=${encodeURIComponent(data.text)}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback
    }
  }
  try {
    const input = document.createElement("textarea");
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    return true;
  } catch {
    return false;
  }
}
