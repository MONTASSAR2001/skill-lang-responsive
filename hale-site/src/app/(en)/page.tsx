import HaleApp from "@/components/hale/HaleApp";
import { LocaleProvider } from "@/i18n";

export default function Home() {
  return (
    <LocaleProvider locale="en">
      <HaleApp />
    </LocaleProvider>
  );
}
