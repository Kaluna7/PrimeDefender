import { Navigate, useParams } from 'react-router-dom';

/** @deprecated Use /purchase/checkout/:planId with ApiPurchasePage layout */
export function PaymentCheckoutPage() {
  const { planId } = useParams();
  return <Navigate to={`/purchase/checkout/${planId}`} replace />;
}
