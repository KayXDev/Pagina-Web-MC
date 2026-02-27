import 'next-auth';

declare module 'next-auth' {
  interface User {
    role?: string;
    avatar?: string;
    banner?: string;
    verified?: boolean;
    username?: string;
    displayName?: string;
    tags?: string[];
    badges?: string[];
    adminSections?: string[];
    adminSectionsConfigured?: boolean;
    balance?: number;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      avatar?: string;
      banner?: string;
      verified?: boolean;
      username?: string;
      displayName?: string;
      tags: string[];
      badges?: string[];
      adminSections?: string[];
      adminSectionsConfigured?: boolean;
      balance?: number;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    id?: string;
    avatar?: string;
    banner?: string;
    verified?: boolean;
    name?: string;
    username?: string;
    displayName?: string;
    tags?: string[];
    badges?: string[];
    adminSections?: string[];
    adminSectionsConfigured?: boolean;
    balance?: number;
  }
}
