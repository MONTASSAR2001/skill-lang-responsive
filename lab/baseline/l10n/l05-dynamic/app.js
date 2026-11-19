const u = window.USER;
const $ = (id) => document.getElementById(id);
function daysAgo(iso) { return Math.round((new Date("2026-03-17T09:30:00Z") - new Date(iso)) / 864e5); }
$("greeting").textContent = `Welcome back, ${u.name}!`;
const lines = [];
lines.push(`You have ${u.unread} new ${u.unread === 1 ? "message" : "messages"}.`);
lines.push(`You placed ${u.orders} ${u.orders === 1 ? "order" : "orders"} this month.`);
lines.push(`Account balance: $${u.balance.toFixed(2)}`);
lines.push(`Last login: ${new Date(u.lastLogin).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} (${daysAgo(u.lastLogin)} days ago)`);
lines.push(`Your next payment is due on ${new Date(u.nextBilling).toLocaleDateString("en-US")}.`);
lines.push(`Storage used: ${(u.storageUsed * 100).toFixed(1)}%`);
lines.push(u.itemsInCart === 0 ? "Your cart is empty." : `You have ${u.itemsInCart} items in your cart.`);
$("summary").innerHTML = lines.map((l) => `<li>${l}</li>`).join("");
$("counts").innerHTML = window.SAMPLE_COUNTS.map((n) => `<li data-n="${n}">${n} ${n === 1 ? "file" : "files"} selected</li>`).join("");
$("promo").innerHTML = u.premium ? `Thanks for being a <b>Pro</b> member — enjoy ${u.discount}% off your next order.` : `Upgrade to <b>Pro</b> and save ${u.discount}%.`;
