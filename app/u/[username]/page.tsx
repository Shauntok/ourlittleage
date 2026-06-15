import UserRoomLoader from "@/components/UserRoomLoader";

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function UserPage({ params, searchParams }: Props) {
  const { username } = await params;
  const { tab } = await searchParams;

  const activeTab = tab === "diary" || tab === "article" ? tab : "all";

  return (
    <UserRoomLoader
      username={decodeURIComponent(username)}
      activeTab={activeTab}
    />
  );
}