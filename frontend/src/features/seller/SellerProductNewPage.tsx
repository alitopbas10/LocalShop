import { useNavigate } from "react-router-dom";
import styled from "styled-components";

import ProductForm, { type ProductFormSubmitValues } from "@/features/seller/ProductForm";
import { useToast } from "@/hooks/useToast";
import { paths } from "@/routes/paths";
import * as sellerProductService from "@/services/sellerProductService";

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

export default function SellerProductNewPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  async function handleSubmit(values: ProductFormSubmitValues) {
    await sellerProductService.create(values);
    showToast("Ürün eklendi.", "success");
    navigate(paths.SELLER_PRODUCTS);
  }

  function handleCancel() {
    navigate(paths.SELLER_PRODUCTS);
  }

  return (
    <div>
      <Title>Yeni Ürün</Title>
      <ProductForm onSubmit={handleSubmit} onCancel={handleCancel} submitLabel="Ürünü Ekle" />
    </div>
  );
}
