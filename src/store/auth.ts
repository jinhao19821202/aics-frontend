import { create } from 'zustand';

export interface UserBrief {
  id: number;
  username: string;
  displayName: string;
  tenantId?: number;
  tenantCode?: string;
  tenantName?: string;
  roles: string[];
  permissions: string[];
  mustChangePassword?: boolean;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserBrief | null;
  setSession: (a: string, r: string, u: UserBrief) => void;
  setAccess: (a: string) => void;
  patchUser: (patch: Partial<UserBrief>) => void;
  clear: () => void;
  hasAuthority: (code: string) => boolean;
}

const LS_KEY = 'cs-admin-session';

const loadInitial = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { accessToken: null, refreshToken: null, user: null };
    const parsed = JSON.parse(raw);
    return {
      accessToken: parsed.accessToken || null,
      refreshToken: parsed.refreshToken || null,
      user: parsed.user || null,
    };
  } catch {
    return { accessToken: null, refreshToken: null, user: null };
  }
};

const persist = (s: Partial<AuthState>) => {
  localStorage.setItem(LS_KEY, JSON.stringify({
    accessToken: s.accessToken,
    refreshToken: s.refreshToken,
    user: s.user,
  }));
};

export const useAuth = create<AuthState>((set, get) => ({
  ...loadInitial(),
  setSession: (a, r, u) => {
    set({ accessToken: a, refreshToken: r, user: u });
    persist({ accessToken: a, refreshToken: r, user: u });
    if (u?.tenantCode) localStorage.setItem('cs-admin-last-tenant', u.tenantCode);
  },
  setAccess: (a) => {
    set({ accessToken: a });
    const cur = get();
    persist({ accessToken: a, refreshToken: cur.refreshToken, user: cur.user });
  },
  patchUser: (patch) => {
    const cur = get();
    if (!cur.user) return;
    const next = { ...cur.user, ...patch };
    set({ user: next });
    persist({ accessToken: cur.accessToken, refreshToken: cur.refreshToken, user: next });
  },
  clear: () => {
    set({ accessToken: null, refreshToken: null, user: null });
    localStorage.removeItem(LS_KEY);
  },
  hasAuthority: (code) => {
    const perms = get().user?.permissions || [];
    return perms.includes(code) || (get().user?.roles || []).includes('SUPER_ADMIN');
  },
}));
