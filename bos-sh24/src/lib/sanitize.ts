import sanitizeHtml from "sanitize-html";

// Erlaubt genau die Formatierungen, die der Redakteurs-Editor erzeugt.
// Verhindert XSS durch beliebige Nutzereingaben im Artikeltext.
export function sanitizeArticleHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: [
      "h2", "h3", "h4", "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li",
      "blockquote", "img", "figure", "figcaption", "iframe", "hr",
      "table", "thead", "tbody", "tr", "th", "td", "span", "video", "source",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      iframe: ["src", "width", "height", "allow", "allowfullscreen", "frameborder", "title"],
      video: ["src", "controls", "width", "height"],
      source: ["src", "type"],
      span: ["class"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    allowedIframeHostnames: ["www.youtube.com", "youtube.com", "player.vimeo.com"],
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
  });
}

export function sanitizePlainish(dirty: string): string {
  return sanitizeHtml(dirty, { allowedTags: [], allowedAttributes: {} }).trim();
}
