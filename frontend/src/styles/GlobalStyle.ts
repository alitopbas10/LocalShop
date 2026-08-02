import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html,
  body {
    height: 100%;
  }

  body {
    font-family:
      system-ui,
      -apple-system,
      "Segoe UI",
      Roboto,
      sans-serif;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  button,
  input {
    font: inherit;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  #root {
    min-height: 100vh;
  }
`;
