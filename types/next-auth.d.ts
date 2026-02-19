import 'next-auth';

declare module 'next-auth' {
  interface User {
    role?: string;
    avatar?: string;
    banner?: string;
    verified?: boolean;
    tags?: string[];
    adminSections?: string[];
    adminSectionsConfigured?: boolean;
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
      tags: string[];
      adminSections?: string[];
      adminSectionsConfigured?: boolean;
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
    tags?: string[];
    adminSections?: string[];
    adminSectionsConfigured?: boolean;
  }
}
