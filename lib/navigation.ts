export interface ProtectedNavigationContext {
  assumeAuthenticated: boolean;
  roles: string[];
}

export function protectedNavigationContext(
  pathname: string,
): ProtectedNavigationContext {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return {
      assumeAuthenticated: true,
      roles: ['administrator'],
    };
  }
  if (pathname === '/review' || pathname.startsWith('/review/')) {
    return {
      assumeAuthenticated: true,
      roles: ['reviewer'],
    };
  }
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    return {
      assumeAuthenticated: true,
      roles: [],
    };
  }
  return {
    assumeAuthenticated: false,
    roles: [],
  };
}
