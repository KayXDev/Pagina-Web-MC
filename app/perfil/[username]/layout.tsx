import PublicProfileShell from './_components/PublicProfileShell';

export default function PublicPerfilLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { username: string };
}) {
  return <PublicProfileShell username={params.username}>{children}</PublicProfileShell>;
}
