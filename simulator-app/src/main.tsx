import React from 'react';
import ReactDOM from 'react-dom/client';
import { getProduct } from '@mlm/product-registry';
import type { ProductId } from '@mlm/simulator-core';
import App from './App';
import { AuthProvider } from './auth/useAuth';
import { AuthGate } from './components/AuthGate';
import './index.css';

const productId = (import.meta.env.VITE_PRODUCT ?? 'lifeplus') as ProductId;
const product = getProduct(productId);
const pricingUrl = `${product.siteUrl}pricing.html`;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <AuthGate pricingUrl={pricingUrl}>
        <App />
      </AuthGate>
    </AuthProvider>
  </React.StrictMode>,
);
