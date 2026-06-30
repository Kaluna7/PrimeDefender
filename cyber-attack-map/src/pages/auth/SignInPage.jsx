import { Navigate, useSearchParams } from 'react-router-dom';

/** Legacy `/signin` → landing intro + Get Started modal (query params preserved for OAuth). */
export function SignInPage() {
  const [params] = useSearchParams();
  const next = new URLSearchParams(params);
  next.set('getstarted', '1');
  const search = next.toString();
  return <Navigate to={search ? `/?${search}` : '/?getstarted=1'} replace />;
}
