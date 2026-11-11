import ChatClient from "@/components/ChatClient";
import { getServerSessionUser } from "@/lib/server-auth";
import { getUserChatConversationsSSR } from "@/lib/queries/marketplace";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const sessionUser = await getServerSessionUser();
  const initialConversations = sessionUser?.id
    ? await getUserChatConversationsSSR(sessionUser.id)
    : null;

  return (
    <ChatClient
      initialUserId={sessionUser?.id ?? null}
      initialConversations={initialConversations}
    />
  );
}
