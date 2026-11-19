import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3217"),
  title: "HALE — Le Portant d’automne",
  description:
    "Une boutique de vêtements sur un portant : faites défiler le portant, décrochez une pièce, retournez-la, choisissez une taille et ajoutez-la au panier. Un modèle SmartDuke Studio.",
  alternates: { canonical: "/fr", languages: { en: "/", fr: "/fr", "x-default": "/" } },
};

export default function FrenchLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
