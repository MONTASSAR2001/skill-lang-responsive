const u = window.USER;
const LOCALE = "ar-u-nu-latn"; // Gregorian calendar, Western digits (consistent with the rest of the page)
const $ = (id) => document.getElementById(id);
const pr = new Intl.PluralRules("ar");
const money = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "USD", currencyDisplay: "narrowSymbol" });
const pct = new Intl.NumberFormat(LOCALE, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "always" });
const dateLong = new Intl.DateTimeFormat(LOCALE, { year: "numeric", month: "long", day: "numeric" });
function daysAgo(iso) { return Math.round((new Date("2026-03-17T09:30:00Z") - new Date(iso)) / 864e5); }
// Arabic has six plural categories: zero, one, two, few (3–10), many (11–99), other (100+)
const forms = (n, f) => f[pr.select(n)] ?? f.other;

$("greeting").textContent = `مرحبًا بعودتك، ${u.name}!`;
const lines = [];
lines.push(forms(u.unread, {
  zero: "ليس لديك رسائل جديدة.", one: "لديك رسالة جديدة واحدة.", two: "لديك رسالتان جديدتان.",
  few: `لديك ${u.unread} رسائل جديدة.`, many: `لديك ${u.unread} رسالة جديدة.`, other: `لديك ${u.unread} رسالة جديدة.`,
}));
lines.push(forms(u.orders, {
  zero: "لم تقدّم أي طلب هذا الشهر.", one: "قدّمت طلبًا واحدًا هذا الشهر.", two: "قدّمت طلبين هذا الشهر.",
  few: `قدّمت ${u.orders} طلبات هذا الشهر.`, many: `قدّمت ${u.orders} طلبًا هذا الشهر.`, other: `قدّمت ${u.orders} طلب هذا الشهر.`,
}));
lines.push(`رصيد الحساب: ${money.format(u.balance)}`);
lines.push(`آخر تسجيل دخول: ${dateLong.format(new Date(u.lastLogin))} (${rtf.format(-daysAgo(u.lastLogin), "day")})`);
lines.push(`موعد دفعتك القادمة هو ${dateLong.format(new Date(u.nextBilling))}.`);
lines.push(`المساحة المستخدمة: ${pct.format(u.storageUsed)}`);
lines.push(u.itemsInCart === 0 ? "سلة التسوق فارغة." : `لديك ${u.itemsInCart} عناصر في سلة التسوق.`);
$("summary").innerHTML = lines.map((l) => `<li>${l}</li>`).join("");
$("counts").innerHTML = window.SAMPLE_COUNTS.map((n) => `<li data-n="${n}">${forms(n, {
  zero: "لم يتم تحديد أي ملف", one: "تم تحديد ملف واحد", two: "تم تحديد ملفين",
  few: `تم تحديد ${n} ملفات`, many: `تم تحديد ${n} ملفًا`, other: `تم تحديد ${n} ملف`,
})}</li>`).join("");
$("promo").innerHTML = u.premium ? `شكرًا لكونك عضوًا في <b>Pro</b> — استمتع بخصم ${u.discount}% على طلبك القادم.` : `رقِّ حسابك إلى <b>Pro</b> ووفّر ${u.discount}%.`;
