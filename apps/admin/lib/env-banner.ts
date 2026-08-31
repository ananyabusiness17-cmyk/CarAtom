export function adminPublicEnv(): 'production' | 'staging' | 'development' {
  const value = (process.env.NEXT_PUBLIC_ENV ?? 'development').toLowerCase();
  if (value === 'production') return 'production';
  if (value === 'staging') return 'staging';
  return 'development';
}
