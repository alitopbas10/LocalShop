import { useCallback, useEffect, useRef, useState } from "react";

export interface UseApiOptions {
  enabled?: boolean;
}

export interface UseApiResult<T> {
  data: T | null;
  error: unknown;
  isLoading: boolean;
  refetch: () => void;
}

// react-query gibi bir kütüphane kurmadan minimal bir veri çekme hook'u. Kasıtlı olarak
// cache/stale-time gibi özellikleri yok — sadece bu projenin ihtiyaç duyduğu iki şeyi
// çözer: yarış koşulu koruması ve unmount sonrası setState koruması.
export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  options: UseApiOptions = {},
): UseApiResult<T> {
  const { enabled = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [reloadToken, setReloadToken] = useState(0);

  // Her istek başlatıldığında bu sayaç artırılır ve o isteğe "numarası" olarak atanır.
  // Kullanıcı arama kutusuna hızlı yazdığında art arda birden fazla istek uçar; ağ
  // gecikmesi yüzünden yanıtlar gönderildikleri sırayla DÖNMEYEBİLİR. Bu korumadan
  // önce, geç dönen ESKİ bir isteğin sonucu daha yeni ve doğru olan bir isteğin
  // sonucunun üzerine yazabilirdi. Belirtisi "arama sonuçları bazen state ile
  // uyuşmuyor/ekranda yanlış şey görünüyor" şeklinde ortaya çıkan, teşhisi zor bir
  // hatadır — çünkü hatayı tetiklemek için hızlı art arda iki istek ve belirli bir
  // ağ gecikmesi sırası gerekir, sabit adımlarla tekrar üretilemez.
  const latestRequestId = useRef(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const requestId = ++latestRequestId.current;
    setIsLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (!isMounted.current || requestId !== latestRequestId.current) {
          return;
        }
        setData(result);
      })
      .catch((err: unknown) => {
        if (!isMounted.current || requestId !== latestRequestId.current) {
          return;
        }
        setError(err);
      })
      .finally(() => {
        if (!isMounted.current || requestId !== latestRequestId.current) {
          return;
        }
        setIsLoading(false);
      });
    // fetcher bilinçli olarak dışarıda bırakıldı: her render'da yeniden oluşturulan bir
    // fonksiyon olabilir, deps listesi yeniden çekmeyi tetikleyecek gerçek girdileri
    // (ör. sayfa numarası, arama terimi) açıkça belirtmek çağıranın sorumluluğundadır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reloadToken, ...deps]);

  const refetch = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return { data, error, isLoading, refetch };
}
