import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";

import { Button, Input } from "@/components/ui";
import AuthLayout from "@/features/auth/AuthLayout";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@/hooks/useMutation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { paths } from "@/routes/paths";
import { getErrorMessage } from "@/services/errorMessages";

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

const DevBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.background};
`;

const DevBoxTitle = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const DevBoxActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
`;

interface DevAccount {
  label: string;
  email: string;
}

const DEV_ACCOUNTS: DevAccount[] = [
  { label: "Müşteri", email: "customer1@localshop.dev" },
  { label: "Satıcı", email: "seller1@localshop.dev" },
];

const DEV_PASSWORD = "Test1234";

interface LocationState {
  from?: { pathname: string };
}

export default function LoginPage() {
  usePageTitle("Giriş Yap");

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { mutate, isLoading, error } = useMutation(login);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await mutate(email, password);
      const state = location.state as LocationState | null;
      navigate(state?.from?.pathname ?? paths.HOME, { replace: true });
    } catch {
      // Hata durumu useMutation'ın error state'i üzerinden zaten yönetiliyor.
    }
  }

  function fillDevAccount(devEmail: string) {
    setEmail(devEmail);
    setPassword(DEV_PASSWORD);
  }

  return (
    <AuthLayout
      title="Giriş Yap"
      subtitle="Hesabınıza erişmek için bilgilerinizi girin"
      footer={
        <span>
          Hesabınız yok mu? <Link to={paths.REGISTER}>Kayıt olun</Link>
        </span>
      }
    >
      <Form onSubmit={handleSubmit}>
        {error !== null && <ErrorBanner role="alert">{getErrorMessage(error)}</ErrorBanner>}

        <Input
          label="E-posta"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          label="Şifre"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <Button type="submit" isLoading={isLoading} fullWidth>
          Giriş Yap
        </Button>

        {import.meta.env.DEV && (
          <DevBox>
            <DevBoxTitle>Test hesapları (yalnızca geliştirme)</DevBoxTitle>
            <DevBoxActions>
              {DEV_ACCOUNTS.map((account) => (
                <Button
                  key={account.email}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fillDevAccount(account.email)}
                >
                  {account.label}
                </Button>
              ))}
            </DevBoxActions>
          </DevBox>
        )}
      </Form>
    </AuthLayout>
  );
}
