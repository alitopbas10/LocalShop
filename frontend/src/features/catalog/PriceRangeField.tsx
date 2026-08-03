import { useEffect, useState } from "react";
import styled from "styled-components";

import { Input } from "@/components/ui";
import { useDebounce } from "@/hooks/useDebounce";

export interface PriceRangeFieldProps {
  minPrice?: number;
  maxPrice?: number;
  onChange: (patch: { minPrice?: number; maxPrice?: number }) => void;
}

const RangeRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.sm};
`;

// flex: 1 iki alanın da eşit genişlikte kalmasını sağlar; min-width: 0 olmadan flex item
// içeriğine göre taşabilir (uzun bir hata metni genişliği bozmasın diye).
const FieldWrapper = styled.div`
  flex: 1;
  min-width: 0;
`;

// Input etiket + kutu olarak iki satır render ediyor; ayıraç etiket satırını değil
// kutu satırını hizalamalı, bu yüzden etiket yüksekliği kadar aşağı itilir.
const Separator = styled.span`
  margin-top: calc(
    ${({ theme }) => theme.fontSizes.sm} + ${({ theme }) => theme.spacing.xs} + ${({ theme }) => theme.spacing.sm}
  );
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

// Native number input'un artırma/azaltma okları dar bu alanda hem kullanışsız (fiyat
// tek tek artırılmaz) hem de kapladığı alanla metni sıkıştırıyor. Global bir CSS yerine
// yalnızca bu bileşene özel olarak styled(Input) ile kaldırılır: Input, className'i
// (rest üzerinden) doğrudan içindeki <input>'a geçirdiği için bu kural sadece o input'u
// etkiler, sayfanın başka bir yerindeki number input'lara sızmaz.
const NoSpinnerInput = styled(Input)`
  -moz-appearance: textfield;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

function parsePriceInput(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed === "") {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function isInvalidRange(minText: string, maxText: string): boolean {
  const min = parsePriceInput(minText);
  const max = parsePriceInput(maxText);
  return min !== undefined && max !== undefined && min > max;
}

const RANGE_ERROR_MESSAGE = "Minimum fiyat maksimumdan büyük olamaz";

export default function PriceRangeField({ minPrice, maxPrice, onChange }: PriceRangeFieldProps) {
  const [minText, setMinText] = useState(minPrice?.toString() ?? "");
  const [maxText, setMaxText] = useState(maxPrice?.toString() ?? "");

  const debouncedMinText = useDebounce(minText, 400);
  const debouncedMaxText = useDebounce(maxText, 400);

  // Debounce beklenmeden anlık geri bildirim: kullanıcı min > max yazar yazmaz her iki
  // alan da hata durumuna geçer.
  const rangeError = isInvalidRange(minText, maxText) ? RANGE_ERROR_MESSAGE : undefined;

  useEffect(() => {
    // Geçersiz aralık üst bileşene hiç bildirilmez, dolayısıyla backend'e hiç gitmez —
    // zaten catalog.schemas.ts'teki .refine kuralı bunu 400 ile reddediyor (Faz 4);
    // kullanıcıyı sunucuya gidip gelmeden burada uyarmak daha iyi.
    if (isInvalidRange(debouncedMinText, debouncedMaxText)) {
      return;
    }

    const parsedMin = parsePriceInput(debouncedMinText);
    const parsedMax = parsePriceInput(debouncedMaxText);
    const patch: { minPrice?: number; maxPrice?: number } = {};
    let hasChange = false;

    if (parsedMin !== minPrice) {
      patch.minPrice = parsedMin;
      hasChange = true;
    }
    if (parsedMax !== maxPrice) {
      patch.maxPrice = parsedMax;
      hasChange = true;
    }
    if (hasChange) {
      onChange(patch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMinText, debouncedMaxText]);

  // Dışarıdan bir değişiklik olursa (ör. "Filtreleri temizle", tarayıcı geri/ileri tuşu)
  // yerel input metinleri URL'deki gerçek değere göre yeniden senkronlanır.
  useEffect(() => setMinText(minPrice?.toString() ?? ""), [minPrice]);
  useEffect(() => setMaxText(maxPrice?.toString() ?? ""), [maxPrice]);

  return (
    <RangeRow>
      <FieldWrapper>
        <NoSpinnerInput
          label="Min. Fiyat"
          type="number"
          min={0}
          inputMode="decimal"
          value={minText}
          error={rangeError}
          onChange={(event) => setMinText(event.target.value)}
        />
      </FieldWrapper>
      <Separator aria-hidden="true">—</Separator>
      <FieldWrapper>
        <NoSpinnerInput
          label="Maks. Fiyat"
          type="number"
          min={0}
          inputMode="decimal"
          value={maxText}
          error={rangeError}
          onChange={(event) => setMaxText(event.target.value)}
        />
      </FieldWrapper>
    </RangeRow>
  );
}
