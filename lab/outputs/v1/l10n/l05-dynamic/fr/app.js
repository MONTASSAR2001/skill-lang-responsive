const u = window.USER;
const LOCALE = "fr-FR";
const $ = (id) => document.getElementById(id);
const pr = new Intl.PluralRules(LOCALE);
// French plural rule: 0 and 1 take the singular ("one"), everything else the plural
const plural = (n, one, other) => (pr.select(n) === "one" ? one : other);
const money = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "USD", currencyDisplay: "narrowSymbol" });
const pct = new Intl.NumberFormat(LOCALE, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "always" });
function daysAgo(iso) { return Math.round((new Date("2026-03-17T09:30:00Z") - new Date(iso)) / 864e5); }
$("greeting").textContent = `Bon retour, ${u.name} !`;
const lines = [];
lines.push(`Vous avez ${u.unread} ${plural(u.unread, "nouveau message", "nouveaux messages")}.`);
lines.push(`Vous avez passé ${u.orders} ${plural(u.orders, "commande", "commandes")} ce mois-ci.`);
lines.push(`Solde du compte : ${money.format(u.balance)}`);
lines.push(`Dernière connexion : ${new Date(u.lastLogin).toLocaleDateString(LOCALE, { year: "numeric", month: "long", day: "numeric" })} (${rtf.format(-daysAgo(u.lastLogin), "day")})`);
lines.push(`Votre prochain paiement est dû le ${new Date(u.nextBilling).toLocaleDateString(LOCALE)}.`);
lines.push(`Stockage utilisé : ${pct.format(u.storageUsed)}`);
lines.push(u.itemsInCart === 0 ? "Votre panier est vide." : `Vous avez ${u.itemsInCart} ${plural(u.itemsInCart, "article", "articles")} dans votre panier.`);
$("summary").innerHTML = lines.map((l) => `<li>${l}</li>`).join("");
$("counts").innerHTML = window.SAMPLE_COUNTS.map((n) => `<li data-n="${n}">${n} ${plural(n, "fichier sélectionné", "fichiers sélectionnés")}</li>`).join("");
$("promo").innerHTML = u.premium ? `Merci d’être membre <b>Pro</b> — profitez de ${u.discount} % de réduction sur votre prochaine commande.` : `Passez à <b>Pro</b> et économisez ${u.discount} %.`;
