import { Suspense } from "react";
import type { Metadata } from "next";
import MapScreen from "@/components/MapScreen";
import RuntimeMarker from "@/components/RuntimeMarker";

type Props = { params: Promise<{ line: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { line } = await params;
  const id = decodeLine(line);
  return {
    title: `Linea ${id} — GTT Live`,
    description: `Dove si trova la linea ${id} a Torino, in questo momento.`,
  };
}

export default function LinePage() {
  return (
    <>
      <MapScreen />
      <Suspense fallback={null}>
        <RuntimeMarker />
      </Suspense>
    </>
  );
}

function decodeLine(value: string): string {
  try {
    return decodeURIComponent(value).slice(0, 16);
  } catch {
    return value.slice(0, 16);
  }
}
