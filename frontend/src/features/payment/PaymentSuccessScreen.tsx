import { Link } from "react-router-dom";
import styled from "styled-components";

import { paths } from "@/routes/paths";

export interface PaymentSuccessScreenProps {
  orderNumber: string;
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.xxl} ${({ theme }) => theme.spacing.lg};
  text-align: center;
`;

const IconCircle = styled.div`
  width: 3.5rem;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => `color-mix(in srgb, ${theme.colors.success} 16%, ${theme.colors.surface})`};
  color: ${({ theme }) => theme.colors.success};
  font-size: ${({ theme }) => theme.fontSizes.xxl};
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.text};
`;

const OrderNumber = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const PrimaryLink = styled(Link)`
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.lg}`};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.surface};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const SecondaryLink = styled(Link)`
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.lg}`};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

// Otomatik yönlendirme YAPILMAZ: kullanıcı ödemenin gerçekten başarılı olduğunu görüp
// onaylamalı, sayfa onun ayağının altından aniden değişmemeli.
export default function PaymentSuccessScreen({ orderNumber }: PaymentSuccessScreenProps) {
  return (
    <Wrapper role="status">
      <IconCircle aria-hidden="true">✓</IconCircle>
      <Title>Ödeme Başarılı</Title>
      <OrderNumber>Sipariş No: {orderNumber}</OrderNumber>
      <Actions>
        <PrimaryLink to={paths.ORDERS}>Siparişlerim</PrimaryLink>
        <SecondaryLink to={paths.PRODUCTS}>Alışverişe Devam Et</SecondaryLink>
      </Actions>
    </Wrapper>
  );
}
