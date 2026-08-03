export const theme = {
  colors: {
    primary: "#2f6b3a",
    primaryDark: "#1f4a27",
    // secondary/success/danger/warning: orijinal tonlardan (#c97b3d/#3a8f4c/#c1442e/#d9a441)
    // biraz daha koyu. Bu renkler hem Badge metni hem de kendi rengiyle harmanlanmış
    // (color-mix) pastel arka planların üzerinde metin olarak kullanılıyor; en zayıf
    // kombinasyon (Badge'in kendi %18 tonlanmış arka planı) WCAG AA'nın 4.5:1 metin
    // eşiğini geçecek şekilde ayarlandı — özellikle eski warning tonu orada yalnızca
    // ~2:1 veriyordu. Değerler theme/design_review sırasında ölçülüp seçildi.
    secondary: "#915728",
    success: "#2e723d",
    danger: "#b33f2b",
    warning: "#835e1a",
    info: "#3d6b8c",
    text: "#2b2620",
    textMuted: "#6b6255",
    background: "#faf7f2",
    surface: "#ffffff",
    border: "#e3ddd1",
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    xxl: "3rem",
  },
  fontSizes: {
    xs: "0.75rem",
    sm: "0.875rem",
    md: "1rem",
    lg: "1.25rem",
    xl: "1.5rem",
    xxl: "2rem",
  },
  fontWeights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  radii: {
    sm: "4px",
    md: "8px",
    lg: "16px",
    full: "9999px",
  },
  shadows: {
    sm: "0 1px 2px rgba(43, 38, 32, 0.08)",
    md: "0 4px 8px rgba(43, 38, 32, 0.12)",
    lg: "0 8px 24px rgba(43, 38, 32, 0.16)",
  },
  breakpoints: {
    mobile: "480px",
    tablet: "768px",
    desktop: "1024px",
    // Katalog gibi geniş grid'lerin 3 sütundan 4 sütuna geçtiği ekstra bir kırılma
    // noktası; desktop'tan (1024px) ayrı tutulur çünkü 1024px'te henüz 4 sütuna yer yok.
    wide: "1280px",
  },
  layout: {
    // Header ve sayfa içeriği aynı genişlikte hizalansın diye ikisi de bu değeri okur.
    maxWidth: "1200px",
  },
} as const;

export type Theme = typeof theme;
