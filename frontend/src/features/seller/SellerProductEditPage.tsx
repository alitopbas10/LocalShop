import { Link, useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";

import { EmptyState, ErrorState, LoadingState } from "@/components/ui";
import ProductForm, { type ProductFormSubmitValues } from "@/features/seller/ProductForm";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import { paths } from "@/routes/paths";
import { ApiError } from "@/services/apiError";
import * as sellerProductService from "@/services/sellerProductService";
import type { UpdateProductInput } from "@/services/sellerProductService";

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const BackLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

export default function SellerProductEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const {
    data: product,
    error,
    isLoading,
    refetch,
  } = useApi(() => sellerProductService.getById(id ?? ""), [id], { enabled: Boolean(id) });

  async function handleSubmit(values: ProductFormSubmitValues) {
    if (!product) {
      return;
    }

    // Backend updateProductSchema en az bir alanın gönderilmesini şart koşuyor
    // (.partial().refine(...)); PATCH bu yüzden yalnızca gerçekten DEĞİŞEN alanları
    // içerir. Hiçbir şey değişmediyse istek hiç gönderilmez — hem gereksiz bir ağ
    // isteği/DB yazması olurdu hem de backend zaten "en az bir alan" kuralına takılıp
    // 400 dönerdi.
    const patch: UpdateProductInput = {};
    if (values.name !== product.name) {
      patch.name = values.name;
    }
    if (values.description !== product.description) {
      patch.description = values.description;
    }
    if (values.price !== product.price) {
      patch.price = values.price;
    }
    if (values.stock !== product.stock) {
      patch.stock = values.stock;
    }
    if (values.category !== product.category) {
      patch.category = values.category;
    }
    // imageUrl'in TEMİZLENMESİ patch'e dahil edilmez: backend boş string'i preprocess
    // ile undefined'a çevirip "alan gönderilmedi" sayıyor (imageUrl: z.preprocess(val =>
    // val === "" ? undefined : val, ...).optional()), yani zaten mevcut bir görseli bu
    // API ile temizlemenin bir yolu yok. Bunu diff'e dahil etmek, tek değişiklik bu
    // olduğunda boş bir PATCH gövdesi (ve "en az bir alan" 400'ü) üretirdi.
    if (values.imageUrl !== undefined && values.imageUrl !== product.imageUrl) {
      patch.imageUrl = values.imageUrl;
    }

    if (Object.keys(patch).length === 0) {
      showToast("Değişiklik yapılmadı.", "info");
      navigate(paths.SELLER_PRODUCTS);
      return;
    }

    await sellerProductService.update(product._id, patch);
    showToast("Ürün güncellendi.", "success");
    navigate(paths.SELLER_PRODUCTS);
  }

  function handleCancel() {
    navigate(paths.SELLER_PRODUCTS);
  }

  if (isLoading) {
    return <LoadingState message="Ürün yükleniyor..." />;
  }

  if (error instanceof ApiError && error.code === "FORBIDDEN") {
    return (
      <EmptyState
        title="Bu ürüne erişim yetkiniz yok"
        description="Bu ürün başka bir satıcıya ait."
        action={<BackLink to={paths.SELLER_PRODUCTS}>Ürünlerime Dön</BackLink>}
      />
    );
  }

  if (error instanceof ApiError && error.code === "NOT_FOUND") {
    return (
      <EmptyState
        title="Ürün bulunamadı"
        description="Aradığınız ürün silinmiş ya da hiç var olmamış olabilir."
        action={<BackLink to={paths.SELLER_PRODUCTS}>Ürünlerime Dön</BackLink>}
      />
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  if (!product) {
    return null;
  }

  return (
    <div>
      <Title>Ürünü Düzenle</Title>
      <ProductForm
        initialValues={{
          name: product.name,
          description: product.description,
          price: product.price,
          stock: product.stock,
          category: product.category,
          imageUrl: product.imageUrl,
        }}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitLabel="Kaydet"
      />
    </div>
  );
}
