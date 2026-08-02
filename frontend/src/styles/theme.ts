export const theme = {
  colors: {
    primary: "#2f6b3a",
    primaryDark: "#1f4a27",
    secondary: "#c97b3d",
    success: "#3a8f4c",
    danger: "#c1442e",
    warning: "#d9a441",
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
  },
} as const;

export type Theme = typeof theme;
