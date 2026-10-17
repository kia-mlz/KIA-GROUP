export function iconSvg(parts: string): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${parts}</svg>`;
}

export const iconParts: Record<string, string> = {
  home: '<path d="M3 10.5 12 3l9 7.5"></path><path d="M5 10v10h14V10"></path>',
  user: '<circle cx="12" cy="8" r="4"></circle><path d="M4 21c1.5-4 4-6 8-6s6.5 2 8 6"></path>',
  search:
    '<circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.35-4.35"></path>',
  settings:
    '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.08V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.08-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6c.32-.27.7-.45 1.1-.52A1.7 1.7 0 0 0 10.9 3V3a2 2 0 1 1 4 0v.09c.07.4.25.78.52 1.1.27.27.65.45 1.1.52.4.07.78.25 1.1.52l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.27.32-.45.7-.52 1.1-.07.45.11.83.38 1.1.32.27.7.45 1.1.52H21a2 2 0 1 1 0 4h-.09c-.4.07-.78.25-1.1.52-.27.27-.45.65-.52 1.1z"></path>',
  heart:
    '<path d="M20.8 5.9a5.4 5.4 0 0 0-7.6 0L12 7.1l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6l1.2 1.2L12 22l7.6-7.3 1.2-1.2a5.4 5.4 0 0 0 0-7.6z"></path>',
  star: '<path d="m12 3 2.8 5.7L21 9.6l-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9L12 3z"></path>',
  bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"></path><path d="M10.5 20a1.5 1.5 0 0 0 3 0"></path>',
  camera:
    '<path d="M4 7h4l2-2h4l2 2h4v12H4z"></path><circle cx="12" cy="13" r="4"></circle>',
  cloud:
    '<path d="M20 17.5A4.5 4.5 0 0 0 18 9a6 6 0 0 0-11.7 1.8A4 4 0 0 0 6 19h12"></path>',
  download:
    '<path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path>',
  upload:
    '<path d="M12 21V9"></path><path d="m17 14-5-5-5 5"></path><path d="M5 3h14"></path>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V8a4 4 0 1 1 8 0v3"></path>',
  unlock:
    '<rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 7-2"></path>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"></path><circle cx="12" cy="12" r="3"></circle>',
  eyeOff:
    '<path d="m3 3 18 18"></path><path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-3.2 4.2"></path><path d="M6.3 6.3A18.3 18.3 0 0 0 2 12s3.5 7 10 7c1.9 0 3.6-.4 5-1.1"></path>',
  trash:
    '<path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 14h10l1-14"></path>',
  edit: '<path d="M12 20h9"></path><path d="m16.5 3.5 4 4L8 20l-5 1 1-5 12.5-12.5z"></path>',
  check: '<path d="m20 6-11 11-5-5"></path>',
  x: '<path d="m18 6-12 12"></path><path d="m6 6 12 12"></path>',
  plus: '<path d="M12 5v14"></path><path d="M5 12h14"></path>',
  minus: '<path d="M5 12h14"></path>',
  code: '<path d="m8 17-5-5 5-5"></path><path d="m16 7 5 5-5 5"></path><path d="m14 4-4 16"></path>',
  terminal: '<path d="m4 17 6-5-6-5"></path><path d="M12 19h8"></path>',
  folder: '<path d="M3 6h6l2 2h10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"></path>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path>',
  play: '<path d="m8 5 11 7-11 7z"></path>',
  pause: '<path d="M8 5h3v14H8z"></path><path d="M13 5h3v14h-3z"></path>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="1"></rect>',
  refresh:
    '<path d="M21 12a9 9 0 1 1-2.6-6.4"></path><path d="M21 3v6h-6"></path>',
  link: '<path d="M10 14a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L17 14"></path><path d="M14 10a5 5 0 0 1 0 7L12.5 18.5a5 5 0 0 1-7-7L7 10"></path>',
  globe:
    '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3a14 14 0 0 1 0 18"></path><path d="M12 3a14 14 0 0 0 0 18"></path>',
  mapPin:
    '<path d="M12 22s7-5.8 7-12a7 7 0 1 0-14 0c0 6.2 7 12 7 12z"></path><circle cx="12" cy="10" r="2.5"></circle>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M8 3v4"></path><path d="M16 3v4"></path><path d="M3 10h18"></path>',
  clock: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l4 2"></path>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path>',
  phone:
    '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.7 19.7 0 0 1-8.6-3 19.3 19.3 0 0 1-6-6 19.7 19.7 0 0 1-3-8.7A2 2 0 0 1 4.2 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.4 2.1L8.1 9.7a16 16 0 0 0 6.2 6.2l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2.1z"></path>',
  message:
    '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>',
  shoppingCart:
    '<circle cx="9" cy="20" r="1"></circle><circle cx="18" cy="20" r="1"></circle><path d="M3 4h2l2.4 11h10.6l2-8H6"></path>',
  bag: '<path d="M6 7h12l1 13H5z"></path><path d="M9 7V5a3 3 0 0 1 6 0v2"></path>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"></path><circle cx="8" cy="8" r="1"></circle>',
  creditCard:
    '<rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="M2 10h20"></path>',
  chartBar:
    '<path d="M4 20V10"></path><path d="M10 20V4"></path><path d="M16 20v-7"></path><path d="M22 20V7"></path>',
  chartLine: '<path d="M3 17l6-6 4 3 7-8"></path><path d="M3 21h18"></path>',
  pieChart: '<path d="M21 12a9 9 0 1 1-9-9"></path><path d="M12 3v9h9"></path>',
  layers:
    '<path d="m12 3 9 5-9 5-9-5 9-5z"></path><path d="m3 12 9 5 9-5"></path><path d="m3 16 9 5 9-5"></path>',
  grid: '<path d="M3 3h8v8H3z"></path><path d="M13 3h8v8h-8z"></path><path d="M3 13h8v8H3z"></path><path d="M13 13h8v8h-8z"></path>',
  list: '<path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><circle cx="4" cy="6" r="1"></circle><circle cx="4" cy="12" r="1"></circle><circle cx="4" cy="18" r="1"></circle>',
  filter:
    '<path d="M3 5h18"></path><path d="M6 12h12"></path><path d="M10 19h4"></path>',
  sliders:
    '<path d="M4 21v-6"></path><path d="M4 11V3"></path><path d="M12 21v-8"></path><path d="M12 8V3"></path><path d="M20 21v-4"></path><path d="M20 12V3"></path><path d="M2 15h4"></path><path d="M10 11h4"></path><path d="M18 15h4"></path>',
  sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.9 4.9 1.4 1.4"></path><path d="m17.7 17.7 1.4 1.4"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m4.9 19.1 1.4-1.4"></path><path d="m17.7 6.3 1.4-1.4"></path>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path>',
  bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"></path>',
  flame:
    '<path d="M12 3s4 3 4 8a4 4 0 1 1-8 0c0-3 2-5 4-8z"></path><path d="M12 13a2.5 2.5 0 1 0 2.5 2.5"></path>',
  shield: '<path d="M12 3 5 6v6c0 5 3.5 8.5 7 10 3.5-1.5 7-5 7-10V6z"></path>',
  trophy:
    '<path d="M8 21h8"></path><path d="M12 17v4"></path><path d="M7 4h10v5a5 5 0 0 1-10 0z"></path><path d="M17 6h3v2a4 4 0 0 1-4 4"></path><path d="M7 6H4v2a4 4 0 0 0 4 4"></path>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"></path>',
  book: '<path d="M4 5a3 3 0 0 1 3-3h13v18H7a3 3 0 0 0-3 3z"></path><path d="M7 2v18"></path>',
  lightbulb:
    '<path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M12 2a7 7 0 0 0-4 12c1 1 1.7 2.1 2 4h4c.3-1.9 1-3 2-4a7 7 0 0 0-4-12z"></path>',
  rocket:
    '<path d="M12 2c4 1 7 4 8 8-2 2-5 3-8 4-3-1-6-2-8-4 1-4 4-7 8-8z"></path><path d="m9 14-2 2"></path><path d="m15 14 2 2"></path><path d="M12 14v8"></path>',
  wifi: '<path d="M2 8a16 16 0 0 1 20 0"></path><path d="M5 12a11 11 0 0 1 14 0"></path><path d="M8.5 15.5a6 6 0 0 1 7 0"></path><circle cx="12" cy="19" r="1"></circle>',
};

export const iconDatabase = Object.entries(iconParts)
  .slice(0, 55)
  .map(([name, parts]) => ({ name, svg: iconSvg(parts) }));

