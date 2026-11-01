import { Suspense } from "react";
import type { Metadata } from "next";
import MapScreen from "@/components/MapScreen";
import RuntimeMarker from "@/components/RuntimeMarker";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const id = decodeCode(code);
  return {
    title: `Fermata ${id} — GTT Live`,
    description: `Prossimi passaggi alla fermata ${id} a Torino.`,
  };
}

export default function StopPage() {
  return (
    <>
      <MapScreen />
      <Suspense fallback={null}>
        <RuntimeMarker />
      </Suspense>
    </>
  );
}

function decodeCode(value: string): string {
  try {
    return decodeURIComponent(value).slice(0, 16);
  } catch {
    return value.slice(0, 16);
  }
}
