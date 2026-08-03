import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";

import { Button, Input } from "@/components/ui";
import AuthLayout from "@/features/auth/AuthLayout";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@/hooks/useMutation";
import { paths } from "@/routes/paths";
import { ApiError } from "@/services/apiError";
import { getErrorMessage } from "@/services/errorMessages";
import type { UserRole } from "@/types/models";
import { mapFieldErrors } from "@/utils/mapFieldErrors";

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const ErrorBanner = styled.p`
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) =>
    `color-mix(in srgb, ${theme.colors.danger} 12%, ${theme.colors.surface})`};
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const FieldLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text};
`;

const RoleGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const RoleOption = styled.label<{ $selected: boolean }>`
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 2px solid
    ${({ theme, $selected }) => ($selected ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $selected }) =>
    $selected
      ? `color-mix(in srgb, ${theme.colors.primary} 10%, ${theme.colors.surface})`
      : theme.colors.surface};
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const HiddenRadio = styled.input`
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

const RoleOptionTitle = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const RoleOptionHint = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ROLE_OPTIONS: { value: UserRole; title: string; hint: string }[] = [
  { value: "customer", title: "Müşteri olarak kayıt ol", hint: "Ürünlere göz at, sepete ekle, sipariş ver" },
  { value: "seller", title: "Satıcı olarak kayıt ol", hint: "Ürün ekle, siparişleri yönet" },
];

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
}

const INITIAL_FORM: RegisterForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "customer",
};

// Bu kontroller yalnızca kullanıcıya submit'ten önce hızlı geri bildirim vermek içindir;
// backend aynı kuralları (auth.schemas.ts) kendi tarafında bağımsızca uygular ve asıl
// kabul/red kararı hep orada verilir — istemci doğrulaması güvenlik sınırı değildir.
function validateClient(form: RegisterForm): Record<string, string> {
  const errors: Record<string, string> = {};

  if (form.name.trim().length < 2) {
    errors.name = "Ad en az 2 karakter olmalı.";
  }
  if (!form.email.trim()) {
    errors.email = "E-posta gerekli.";
  }
  if (form.password.length < 8 || !PASSWORD_PATTERN.test(form.password)) {
    errors.password = "Şifre en az 8 karakter olmalı ve en az bir harf ile bir rakam içermeli.";
  }
  if (form.confirmPassword !== form.password) {
    errors.confirmPassword = "Şifreler eşleşmiyor.";
  }

  return errors;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<RegisterForm>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { mutate, isLoading, error } = useMutation(register);

  function updateField<K extends keyof RegisterForm>(key: K, value: RegisterForm[K]) {
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

    const clientErrors = validateClient(form);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setFieldErrors({});
    try {
      await mutate({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      navigate(paths.HOME, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
        setFieldErrors(mapFieldErrors(err));
      }
    }
  }

  // VALIDATION_ERROR zaten alan bazlı olarak gösteriliyor; üstteki banner yalnızca
  // alana eşlenemeyen hatalar (ör. DUPLICATE_RESOURCE) için kullanılır.
  const showErrorBanner = error !== null && !(error instanceof ApiError && error.code === "VALIDATION_ERROR");

  return (
    <AuthLayout
      title="Kayıt Ol"
      subtitle="LocalShop'ta yerel üreticilerle buluşun"
      footer={
        <span>
          Zaten hesabınız var mı? <Link to={paths.LOGIN}>Giriş yapın</Link>
        </span>
      }
    >
      <Form onSubmit={handleSubmit} noValidate>
        {showErrorBanner && <ErrorBanner role="alert">{getErrorMessage(error)}</ErrorBanner>}

        <Input
          label="Ad"
          autoComplete="name"
          error={fieldErrors.name}
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
        />
        <Input
          label="E-posta"
          type="email"
          autoComplete="email"
          error={fieldErrors.email}
          value={form.email}
          onChange={(event) => updateField("email", event.target.value)}
        />
        <Input
          label="Şifre"
          type="password"
          autoComplete="new-password"
          error={fieldErrors.password}
          hint="En az 8 karakter, en az bir harf ve bir rakam içermeli"
          value={form.password}
          onChange={(event) => updateField("password", event.target.value)}
        />
        <Input
          label="Şifre Tekrar"
          type="password"
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
          value={form.confirmPassword}
          onChange={(event) => updateField("confirmPassword", event.target.value)}
        />

        <FieldGroup>
          <FieldLabel id="role-label">Hesap Türü</FieldLabel>
          <RoleGroup role="radiogroup" aria-labelledby="role-label">
            {ROLE_OPTIONS.map((option) => (
              <RoleOption key={option.value} $selected={form.role === option.value}>
                <HiddenRadio
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={form.role === option.value}
                  onChange={() => updateField("role", option.value)}
                />
                <RoleOptionTitle>{option.title}</RoleOptionTitle>
                <RoleOptionHint>{option.hint}</RoleOptionHint>
              </RoleOption>
            ))}
          </RoleGroup>
        </FieldGroup>

        <Button type="submit" isLoading={isLoading} fullWidth>
          Kayıt Ol
        </Button>
      </Form>
    </AuthLayout>
  );
}
