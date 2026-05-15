import type { ProductDefinition, ProductId } from '@mlm/simulator-core';
import { lifeplusProduct } from '@mlm/product-lifeplus';
import { fitlineProduct } from '@mlm/product-fitline';
import { eqologyProduct } from '@mlm/product-eqology';

export const products: ProductDefinition[] = [
  lifeplusProduct,
  fitlineProduct,
  eqologyProduct,
];

export function getProduct(productId: ProductId): ProductDefinition {
  const product = products.find((candidate) => candidate.id === productId);
  if (!product) {
    throw new Error(`Unknown product: ${productId}`);
  }
  return product;
}
