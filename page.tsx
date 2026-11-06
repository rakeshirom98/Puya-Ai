import { auth } from "@clerk/nextjs/server";
import { ChatWorkspace } from "@/components/chat-workspace";

export default async function Home() {
  await auth.protect();
  return <ChatWorkspace />;
}
