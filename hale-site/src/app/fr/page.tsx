import HaleApp from "@/components/hale/HaleApp";
import { LocaleProvider } from "@/i18n";

export default function HomeFr() {
  return (
    <LocaleProvider locale="fr">
      <HaleApp />
    </LocaleProvider>
  );
}
