interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

let user = $state<User | null>(null);
let loading = $state(true);

export const authStore = {
  get user() { return user; },
  get loading() { return loading; },
  get isAdmin() { return user?.role === 'super_admin'; },

  async init() {
    try {
      const res = await fetch('/api/auth/get-session', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json() as { user?: User };
        user = data.user || null;
      }
    } catch {
      user = null;
    } finally {
      loading = false;
    }
  },

  setUser(u: User | null) {
    user = u;
  },

  logout() {
    user = null;
    window.location.href = '/login';
  },
};
