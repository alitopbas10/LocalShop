import { useEffect, useState, type FormEvent } from "react";
import styled from "styled-components";

import { Button, Input, Select, TextArea, type SelectOption } from "@/components/ui";
import { CATEGORY_LABELS, CATEGORY_VALUES } from "@/features/catalog/categoryPresentation";
import { ApiError } from "@/services/apiError";
import { getErrorMessage } from "@/services/errorMessages";
import type { ProductCategory } from "@/types/models";
import { mapFieldErrors } from "@/utils/mapFieldErrors";

export interface ProductFormInitialValues {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: ProductCategory;
  imageUrl?: string;
}

export interface ProductFormSubmitValues {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: ProductCategory;
  imageUrl?: string;
}

export interface ProductFormProps {
  initialValues?: ProductFormInitialValues;
  onSubmit: (values: ProductFormSubmitValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

interface FormState {
  name: string;
  description: string;
  price: string;
  stock: string;
  category: ProductCategory | "";
  imageUrl: string;
}

const DESCRIPTION_MAX_LENGTH = 2000;

function toFormState(values?: ProductFormInitialValues): FormState {
  return {
    name: values?.name ?? "",
    description: values?.description ?? "",
    price: values?.price !== undefined ? String(values.price) : "",
    stock: values?.stock !== undefined ? String(values.stock) : "",
    category: values?.category ?? "",
    imageUrl: values?.imageUrl ?? "",
  };
}

const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

// Bu kontroller yalnızca kullanıcıya submit'ten önce hızlı geri bildirim vermek içindir;
// backend (product.schemas.ts) aynı sınırları kendi tarafında bağımsızca uygular ve asıl
// kabul/red kararı hep orada verilir.
function validate(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};

  const nameLength = form.name.trim().length;
  if (nameLength < 2 || nameLength > 200) {
    errors.name = "Ad 2-200 karakter olmalı.";
  }

  const descriptionLength = form.description.trim().length;
  if (descriptionLength < 10 || descriptionLength > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Açıklama 10-${DESCRIPTION_MAX_LENGTH} karakter olmalı.`;
  }

  const priceText = form.price.trim();
  const price = Number(priceText);
  if (priceText === "" || !Number.isFinite(price) || price <= 0) {
    errors.price = "Fiyat 0'dan büyük bir sayı olmalı.";
  } else if (!PRICE_PATTERN.test(priceText)) {
    errors.price = "Fiyat en fazla 2 ondalık basamak içerebilir.";
  }

  const stockText = form.stock.trim();
  const stock = Number(stockText);
  if (stockText === "" || !Number.isInteger(stock) || stock < 0) {
    errors.stock = "Stok 0 veya daha büyük bir tam sayı olmalı.";
  }

  if (form.category === "") {
    errors.category = "Kategori seçmelisiniz.";
  }

  return errors;
}

const CATEGORY_OPTIONS: SelectOption[] = CATEGORY_VALUES.map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}));

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  max-width: 640px;
`;

const ErrorBanner = styled.p`
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => `color-mix(in srgb, ${theme.colors.danger} 12%, ${theme.colors.surface})`};
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const CharCount = styled.span`
  align-self: flex-end;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const PreviewFrame = styled.div`
  width: 8rem;
  aspect-ratio: 1 / 1;
  border-radius: ${({ theme }) => theme.radii.md};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const PreviewImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PreviewError = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xs};
  text-align: center;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  background: ${({ theme }) => theme.colors.background};
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

export default function ProductForm({ initialValues, onSubmit, onCancel, submitLabel = "Kaydet" }: ProductFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(initialValues));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  // Görsel URL'i değiştiğinde önceki denemenin "yüklenemedi" durumu taşınmamalı; yeni
  // bir URL her zaman temiz bir önizleme denemesiyle başlar.
  useEffect(() => {
    setImageLoadFailed(false);
  }, [form.imageUrl]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!(key in prev)) {
        return prev;
      }
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const clientErrors = validate(form);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setFieldErrors({});
    setSubmitError(null);

    const values: ProductFormSubmitValues = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price.trim()),
      stock: Number(form.stock.trim()),
      category: form.category as ProductCategory,
      imageUrl: form.imageUrl.trim() === "" ? undefined : form.imageUrl.trim(),
    };

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
        setFieldErrors(mapFieldErrors(err));
      } else {
        setSubmitError(err);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const showImagePreview = form.imageUrl.trim() !== "";

  return (
    <Form onSubmit={handleSubmit} noValidate>
      {submitError !== null && <ErrorBanner role="alert">{getErrorMessage(submitError)}</ErrorBanner>}

      <Input
        label="Ürün Adı"
        error={fieldErrors.name}
        value={form.name}
        onChange={(event) => updateField("name", event.target.value)}
      />

      <div>
        <TextArea
          label="Açıklama"
          error={fieldErrors.description}
          value={form.description}
          onChange={(event) => updateField("description", event.target.value)}
        />
        <CharCount>
          {form.description.length} / {DESCRIPTION_MAX_LENGTH}
        </CharCount>
      </div>

      <Input
        label="Fiyat (TL)"
        inputMode="decimal"
        placeholder="0.00"
        error={fieldErrors.price}
        value={form.price}
        onChange={(event) => updateField("price", event.target.value)}
      />

      <Input
        label="Stok"
        inputMode="numeric"
        placeholder="0"
        error={fieldErrors.stock}
        value={form.stock}
        onChange={(event) => updateField("stock", event.target.value)}
      />

      <Select
        label="Kategori"
        options={[{ value: "", label: "Kategori seçin", disabled: true }, ...CATEGORY_OPTIONS]}
        error={fieldErrors.category}
        value={form.category}
        onChange={(event) => updateField("category", event.target.value as ProductCategory | "")}
      />

      <Input
        label="Görsel URL (opsiyonel)"
        placeholder="https://..."
        error={fieldErrors.imageUrl}
        value={form.imageUrl}
        onChange={(event) => updateField("imageUrl", event.target.value)}
      />

      {showImagePreview && (
        <PreviewFrame>
          {imageLoadFailed ? (
            <PreviewError>Görsel yüklenemedi</PreviewError>
          ) : (
            <PreviewImage src={form.imageUrl} alt="Ürün görseli önizleme" onError={() => setImageLoadFailed(true)} />
          )}
        </PreviewFrame>
      )}

      <Actions>
        <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          İptal
        </Button>
      </Actions>
    </Form>
  );
}
