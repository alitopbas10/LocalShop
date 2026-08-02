import styled from "styled-components";

// Standart "sr-only" deseni: içerik ekranda görünmez ama ekran okuyucular tarafından
// okunur. display:none kullanılmaz çünkü o durumda ekran okuyucular da içeriği atlar.
const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

export default VisuallyHidden;
