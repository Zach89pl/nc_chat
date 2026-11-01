// Proste wykrywanie przekleństw (polskie i angielskie rdzenie słów)
const PATTERNS = [
  /kurw/,
  /chuj/,
  /\bhuj/,
  /pierd[oa]l/,
  /jeb/,
  /pizd/,
  /skurw/,
  /\bcip(a|y|ie|e|ka|ki|ko)\b/,
  /\bdup(a|y|ie|e|ek|ka|ki)\b/,
  /fuck/,
  /shit/,
  /bitch/,
  /cunt/,
  /asshole/,
  /motherf/,
];

export function hasSwears(text: string) {
  const clean = text
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return PATTERNS.some((p) => p.test(clean));
}
