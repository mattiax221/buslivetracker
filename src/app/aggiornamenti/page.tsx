import type { Metadata } from "next";
import UpdatesPageClient from "../../components/UpdatesPageClient";

export const metadata: Metadata = {
  title: "Aggiornamenti — GTT Live",
  description:
    "Changelog, prossimi update, suggerimenti utenti e notifiche push per GTT Live Torino.",
};

export default function AggiornamentiPage() {
  return <UpdatesPageClient />;
}
