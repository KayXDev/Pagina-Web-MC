import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email y contraseña son requeridos');
        }

        await dbConnect();
        
        const user = await User.findOne({ email: credentials.email.toLowerCase() });

        if (!user) {
          throw new Error('Usuario no encontrado');
        }

        if (user.isBanned) {
          throw new Error(`Usuario baneado: ${user.bannedReason || 'Sin razón especificada'}`);
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error('Contraseña incorrecta');
        }

        // Update last login (sin validar todo el documento)
        await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.username,
          username: user.username,
          displayName: String((user as any).displayName || ''),
          role: user.role,
          avatar: user.avatar,
          banner: (user as any).banner || '',
          verified: Boolean((user as any).verified),
          tags: Array.isArray((user as any).tags) ? (user as any).tags : [],
          badges: Array.isArray((user as any).badges) ? (user as any).badges : [],
          balance: Number((user as any).balance || 0),
          adminSections: Array.isArray((user as any).adminSections) ? ((user as any).adminSections as string[]) : [],
          adminSectionsConfigured: Boolean((user as any).adminSectionsConfigured),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.avatar = user.avatar;
        token.banner = (user as any).banner as string;
        token.verified = Boolean((user as any).verified);
        token.name = user.name ?? undefined;
        token.username = (user as any).username ?? user.name ?? undefined;
        token.displayName = typeof (user as any).displayName === 'string' ? ((user as any).displayName as string) : undefined;
        token.tags = (user as any).tags || [];
        token.badges = (user as any).badges || [];
        token.balance = Number((user as any).balance || 0);
        token.adminSections = (user as any).adminSections || [];
        token.adminSectionsConfigured = Boolean((user as any).adminSectionsConfigured);
      }

      if (trigger === 'update') {
        if (typeof (session as any)?.name === 'string') token.name = (session as any).name;
        if (typeof (session as any)?.username === 'string') token.username = (session as any).username;
        if (typeof (session as any)?.displayName === 'string') token.displayName = (session as any).displayName;
        if (typeof (session as any)?.avatar === 'string') token.avatar = (session as any).avatar;
        if (typeof (session as any)?.banner === 'string') token.banner = (session as any).banner;
        if (typeof (session as any)?.verified === 'boolean') token.verified = (session as any).verified;
        if (typeof (session as any)?.balance === 'number') token.balance = (session as any).balance;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.avatar = token.avatar as string;
        session.user.banner = token.banner as string;
        session.user.verified = Boolean((token as any).verified);
        session.user.name = token.name as string;
        (session.user as any).username = ((token as any).username as string) || (token.name as string);
        (session.user as any).displayName = ((token as any).displayName as string) || '';
        session.user.tags = (token.tags as string[]) || [];
        (session.user as any).badges = ((token as any).badges as string[]) || [];
        (session.user as any).balance = typeof (token as any).balance === 'number' ? ((token as any).balance as number) : 0;
        session.user.adminSections = (token.adminSections as string[]) || [];
        session.user.adminSectionsConfigured = Boolean((token as any).adminSectionsConfigured);
      }

      // Mantener tags/role/name sincronizados con DB sin tener que cerrar sesión.
      // Esto permite que con recargar la página se reflejen cambios (p.ej. tags asignados por OWNER).
      try {
        const userId = typeof (token as any).id === 'string' ? ((token as any).id as string) : '';
        if (userId && session.user) {
          await dbConnect();
          const fresh = await User.findById(userId)
            .select('username displayName role avatar banner verified tags badges balance adminSections adminSectionsConfigured isBanned bannedReason')
            .lean();

          if (fresh) {
            session.user.name = fresh.username;
            (session.user as any).username = fresh.username;
            (session.user as any).displayName = String((fresh as any).displayName || '');
            session.user.role = fresh.role;
            session.user.avatar = (fresh as any).avatar;
            session.user.banner = (fresh as any).banner;
            session.user.verified = Boolean((fresh as any).verified);
            session.user.tags = Array.isArray((fresh as any).tags) ? ((fresh as any).tags as string[]) : [];
            (session.user as any).badges = Array.isArray((fresh as any).badges) ? ((fresh as any).badges as string[]) : [];
            (session.user as any).balance = Number((fresh as any).balance || 0);
            session.user.adminSections = Array.isArray((fresh as any).adminSections)
              ? ((fresh as any).adminSections as string[])
              : [];
            session.user.adminSectionsConfigured = Boolean((fresh as any).adminSectionsConfigured);
          }
        }
      } catch {
        // Si falla el refresh, devolvemos el session con el token (no rompemos auth).
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
