export const equipmentTabs = (active: "mine" | "inventory" | "catalog") => [
  { href: "/equipment", label: "Meine Ausrüstung", active: active === "mine" },
  { href: "/equipment/inventory", label: "Mein Inventar", active: active === "inventory" },
  { href: "/equipment/catalog", label: "Katalog", active: active === "catalog" },
];

export const shoppingTabs = (active: "mine" | "team") => [
  { href: "/shopping", label: "Meine Einkaufsliste", active: active === "mine" },
  { href: "/shopping/team", label: "Team-Einkaufsliste", active: active === "team" },
];
