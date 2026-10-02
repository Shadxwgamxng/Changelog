export const teamTabs = (active: "members" | "about") => [
  { href: "/team", label: "Mitglieder", active: active === "members" },
  { href: "/team/about", label: "Teamprofil", active: active === "about" },
];
