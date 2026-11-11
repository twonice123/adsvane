// Icons for the business page tab row (Photos, Contact, Reviews, Reposts, Saved).
const s = { viewBox: "0 0 24 24", width: 18, height: 18, "aria-hidden": true } as const;
const line = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinejoin: "round", strokeLinecap: "round" } as const;

export const TAB_ICONS = {
  photos: <svg {...s} fill="currentColor"><path d="M3 3h5v5H3zM9.5 3h5v5h-5zM16 3h5v5h-5zM3 9.5h5v5H3zM9.5 9.5h5v5h-5zM16 9.5h5v5h-5zM3 16h5v5H3zM9.5 16h5v5h-5zM16 16h5v5h-5z" /></svg>,
  contact: <svg {...s} {...line}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>,
  reviews: <svg {...s} {...line}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>,
  reposts: <svg {...s} {...line}><path d="M4 11V9a3 3 0 0 1 3-3h12" /><path d="m16 3 3 3-3 3" /><path d="M20 13v2a3 3 0 0 1-3 3H5" /><path d="m8 21-3-3 3-3" /></svg>,
  saved: <svg {...s} {...line}><path d="M6 3h12v18l-6-4.5L6 21z" /></svg>,
};

export function profileTabs(withSaved: boolean) {
  return [
    { key: "photos", label: "Photos", icon: TAB_ICONS.photos },
    { key: "contact", label: "Contact", icon: TAB_ICONS.contact },
    { key: "reviews", label: "Reviews", icon: TAB_ICONS.reviews },
    { key: "reposts", label: "Reposts", icon: TAB_ICONS.reposts },
    ...(withSaved ? [{ key: "saved", label: "Saved", icon: TAB_ICONS.saved }] : []),
  ];
}
