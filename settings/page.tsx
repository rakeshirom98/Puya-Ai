import { auth } from "@clerk/nextjs/server";
import { SettingsWorkspace } from "@/components/settings-workspace";

export default async function SettingsPage() {
  await auth.protect();
  return <SettingsWorkspace />;
}
