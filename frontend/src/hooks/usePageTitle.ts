import { useEffect } from "react";

const SITE_NAME = "LocalShop";

// document.title tarayıcı sekmesinde ve geçmişte (bookmarks, history) görünen tek yerdir;
// React Router bunu kendiliğinden yönetmez. title yalnızca burada, tek bir yerden
// oluşturulur ki her sayfa "X | LocalShop" biçimini elle tekrar etmesin.
export function usePageTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  }, [title]);
}
