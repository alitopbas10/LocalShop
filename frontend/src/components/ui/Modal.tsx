import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.md};
  /* Saf siyah yerine metin renginin yarı saydam hali kullanılır: sıcak/nötr palete
     daha uygun bir loş perde elde edilir, ayrı bir renk sabiti icat edilmez. */
  background: color-mix(in srgb, ${({ theme }) => theme.colors.text} 55%, transparent);
  z-index: 100;
`;

const Content = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  width: 100%;
  max-width: ${({ theme }) => theme.breakpoints.mobile};
  max-height: 90vh;
  overflow-y: auto;

  &:focus-visible {
    outline: none;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* Dokunma hedefi en az 44x44px olsun diye. */
  min-width: 2.75rem;
  min-height: 2.75rem;
  background: transparent;
  border: none;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  line-height: 1;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radii.sm};

  &:hover {
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

// Modal içinde Tab ile odaklanılabilecek elemanları bulmak için kullanılır. gizli
// (display:none/visibility:hidden, offsetParent===null ile tespit edilir) elemanlar
// odak tuzağına dahil edilmez, aksi halde Tab görünmeyen bir elemana takılıp kalabilir.
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Odak tuzağı: Modal açıkken Tab, arkadaki sayfaya KAÇAMAZ — ilk/son odaklanabilir
  // eleman sınırında döngü yapar. Bu olmadan (önceki davranış) klavye kullanıcısı Tab'a
  // basa basa modalın arkasındaki, görünmeyen/örtülü sayfa içeriğine odaklanabiliyordu.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !contentRef.current) {
        return;
      }

      const focusable = Array.from(
        contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Modal açıkken arkadaki sayfanın kaydırılması kilitlenir; kapanınca önceki
  // overflow değeri (ne olursa olsun) geri yüklenir.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Açılışta odak modalın içine taşınır (ve nereden açıldığı hatırlanır); kapanışta
  // odak modalı TETİKLEYEN elemana geri döner — aksi halde klavye/ekran okuyucu
  // kullanıcısı modal kapandıktan sonra sayfanın en başına (body) fırlatılmış olurdu.
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
      contentRef.current?.focus();
    } else {
      previouslyFocusedRef.current?.focus();
      previouslyFocusedRef.current = null;
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function handleOverlayMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return createPortal(
    <Overlay onMouseDown={handleOverlayMouseDown}>
      <Content
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        {title && (
          <Header>
            <Title id={titleId}>{title}</Title>
            <CloseButton type="button" onClick={onClose} aria-label="Kapat">
              ✕
            </CloseButton>
          </Header>
        )}
        {children}
      </Content>
    </Overlay>,
    document.body,
  );
}
