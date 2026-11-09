// Promo slides for the top of the landing page.
// To use a photo, put it in public/slides/ (e.g. public/slides/braids.jpg)
// and set image: "/slides/braids.jpg". Without an image the slide uses its colors.
export type Slide = {
  title: string;
  text: string;
  cta?: { label: string; href: string };
  image?: string;
  colors: [string, string];
};

export const SLIDES: Slide[] = [
  {
    title: "Find trusted local services",
    text: "Braiders, barbers, restaurants, movers and more, with real reviews from real customers.",
    cta: { label: "Find services", href: "/find" },
    colors: ["#2e1065", "#7c3aed"],
  },
  {
    title: "Put your business on AdsVane, free",
    text: "Create your page in five minutes. Get found, get reviews, grow.",
    cta: { label: "Add your business", href: "/dashboard" },
    colors: ["#0d0b12", "#5b21b6"],
  },
  {
    title: "Turn happy visits into reviews",
    text: "Print your QR code. Customers scan, rate and you shine.",
    cta: { label: "Get started", href: "/dashboard" },
    colors: ["#4c1d95", "#c026d3"],
  },
  {
    title: "Get seen first with Promote",
    text: "Show up at the top of search and in emails to customers nearby. From $5 a day.",
    cta: { label: "Learn more", href: "/dashboard" },
    colors: ["#1e1b4b", "#7c3aed"],
  },
];
