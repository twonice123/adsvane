import type { Item } from "./textStyles";

// Emoji stickers, in groups like a phone keyboard.
const g = (s: string) => Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s.replace(/\s+/g, ""))).map((x) => x.segment);

export const EMOJI_GROUPS: { k: string; icon: string; name: string; list: () => string[] }[] = [
  { k: "beauty", icon: "💅", name: "Beauty", list: () => g("💅💇‍♀️💇🏾‍♀️💇🏿‍♀️💇‍♂️💇🏾‍♂️✂️💈💄💋👄🧴🧼🪮🪒🧖‍♀️🧖🏾‍♀️💆‍♀️💆🏾‍♀️👑💍💎👗👠👜🕶️🎀🪞🛁🌸🌺🌷💐🌹✨💫⭐🌟") },
  { k: "smile", icon: "😀", name: "Smileys", list: () => g("😀😃😄😁😆😅🤣😂🙂😉😊😇🥰😍🤩😘😗😚😙🥲😋😛😜🤪😝🤑🤗🤭🫢🤫🤔🫡🤐🤨😐😑😶🫥😏😒🙄😬😮‍💨🤥😌😔😪🤤😴😷🤒🤕🤢🤮🥵🥶🥴😵🤯🤠🥳🥸😎🤓🧐😕🫤😟🙁😮😯😲😳🥺🥹😦😧😨😰😥😢😭😱😖😣😞😓😩😫🥱😤😡😠🤬😈👿💀☠️💩🤡👻👽🤖😺😸😹😻😼😽🙀😿😾") },
  { k: "love", icon: "❤️", name: "Love", list: () => g("❤️🩷🧡💛💚💙🩵💜🤎🖤🩶🤍💔❤️‍🔥❤️‍🩹❣️💕💞💓💗💖💘💝💟💌💋🫶🫶🏽🫶🏿🥰😍😘😻💑💏👩‍❤️‍👨🌹") },
  { k: "hands", icon: "👋", name: "Hands", list: () => g("👋🤚🖐️✋🖖👌🤌🤏✌️🤞🫰🤟🤘🤙👈👉👆👇☝️👍👎✊👊🤛🤜👏🙌🫶👐🤲🤝🙏✍️💪🦾👋🏽👍🏽👏🏽🙌🏽🙏🏽💪🏽👋🏿👍🏿👏🏿🙌🏿🙏🏿💪🏿👀👁️👅👂🦻👃🧠🫀🦷") },
  { k: "party", icon: "🎉", name: "Celebrate", list: () => g("🎉🎊🥳🎈🎂🍰🧁🎁🎀🪅🪩🍾🥂🍻🎆🎇✨🌟⭐💫🔥💯🏆🥇🎖️🏅🎗️🎟️🎫🎤🎧🎶🎵🎼💃🕺🪇") },
  { k: "biz", icon: "📅", name: "Business", list: () => g("📅📆🗓️⏰⏳⌛🕐📍📌🗺️🏠🏡🏪🏬🚗🚕📞☎️📱💬📩📧✉️💌💰💵💸💳🏷️🛍️🛒🎁📣📢🔔🆕🆓🔝✅☑️✔️❌⭕🛑⚠️🔞💲") },
  { k: "food", icon: "🍓", name: "Food", list: () => g("🍓🍒🍑🥭🍍🍌🍉🍇🍊🍋🍎🍏🥑🥥🍯🧋☕🍵🧃🥤🍹🍸🍷🥂🍾🍕🍔🍟🌮🌯🥗🍣🍤🍩🍪🍫🍬🍭🍦🍨") },
  { k: "nature", icon: "🌸", name: "Nature", list: () => g("🌸🌺🌻🌼🌷🌹🥀💐🪷🪻🌿🍀🍃🌴🌵🌱🌈☀️🌤️⛅🌙🌛⭐🌟✨⚡🔥💧🌊❄️☃️🦋🐝🐞🐬🐳🦄🐶🐱🐰🦊🐻🐼🐨🐯🦁") },
  { k: "symbols", icon: "⭐", name: "Symbols", list: () => g("💯✨⭐🌟💫🔥💥💢💦💨🕊️🎯♻️✅❎➕➖➗✖️❗❓‼️⁉️🔴🟠🟡🟢🔵🟣🟤⚫⚪🔺🔻🔸🔹🔶🔷💠🔘🆗🆒🆙🆕🆓🔝🔜🔛💲💱™️©️®️➡️⬅️⬆️⬇️↗️↘️🔁🔂▶️⏸️⏹️⏺️") },
];

// Written stickers for offers, each with its own look.
type Look = Pick<Item, "color" | "font" | "effect" | "bg">;
const LOOKS: Look[] = [
  { color: "#4c3a99", font: "classic", effect: "none", bg: "solid" },
  { color: "#ed4956", font: "anton", effect: "none", bg: "solid" },
  { color: "#fdcb5c", font: "poster", effect: "none", bg: "solid" },
  { color: "#ffffff", font: "squeeze", effect: "block", bg: "" },
  { color: "#d10869", font: "bubble", effect: "none", bg: "solid" },
  { color: "#000000", font: "strong", effect: "none", bg: "solid" },
  { color: "#70c050", font: "modernb", effect: "none", bg: "solid" },
  { color: "#ffffff", font: "marker", effect: "neon", bg: "" },
  { color: "#3897f0", font: "classic", effect: "none", bg: "solid" },
  { color: "#fd8d32", font: "anton", effect: "none", bg: "solid" },
];
const WORDS: [string, string[]][] = [
  ["Promos", ["SPECIAL PROMO", "UPCOMING PROMO", "PROMO ALERT", "FLASH SALE", "SALE", "MEGA SALE", "LIMITED TIME", "TODAY ONLY", "THIS WEEK ONLY", "WEEKEND SPECIAL", "HOLIDAY SPECIAL", "BLACK FRIDAY", "CYBER MONDAY", "NEW YEAR SPECIAL", "VALENTINE'S SPECIAL", "MOTHER'S DAY SPECIAL", "BACK TO SCHOOL", "SUMMER SPECIAL"]],
  ["Discounts", ["10% OFF", "15% OFF", "20% OFF", "25% OFF", "30% OFF", "40% OFF", "50% OFF", "$10 OFF", "$20 OFF", "$25 OFF", "$50 OFF", "BUY 1 GET 1", "2 FOR 1", "FREE WASH", "FREE TOUCH-UP", "FREE CONSULTATION", "NEW CLIENT DEAL", "REFER A FRIEND", "STUDENT DISCOUNT"]],
  ["Booking", ["BOOK NOW", "BOOKING OPEN", "DM TO BOOK", "LINK TO BOOK", "CALL TO BOOK", "WALK-INS WELCOME", "OPEN TODAY", "LAST SPOTS", "LIMITED SPOTS", "FULLY BOOKED", "DEPOSIT REQUIRED", "SAME-DAY APPOINTMENTS"]],
  ["Shout-outs", ["NEW", "NEW STYLE", "FRESH", "HOT 🔥", "TRENDING", "BEFORE", "AFTER", "BEFORE & AFTER", "CLIENT LOVE", "THANK YOU", "COMING SOON", "WE'RE HIRING"]],
];
export const PROMO_GROUPS = WORDS.map(([name, list], gi) => ({ name, list: list.map((text, i) => ({ text, look: LOOKS[(i + gi * 3) % LOOKS.length] })) }));
