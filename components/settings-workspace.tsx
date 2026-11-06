"use client";

import {
  ArrowLeft,
  Bell,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Database,
  Download,
  FileClock,
  Fingerprint,
  Globe,
  Keyboard,
  Link2,
  LockKeyhole,
  Menu,
  Moon,
  PawPrint,
  Search,
  Shield,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  UserRound,
  Volume2,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Provider = "groq" | "gemini";
type ModelOption = { value: string; label: string };
type SettingsValues = {
  theme: "light" | "dark";
  themePreference: "system" | "light" | "dark";
  provider: Provider;
  model: string;
  saveActivity: boolean;
  responseLanguage: string;
  responseStyle: string;
  manipuriScript: string;
  aboutYou: string;
  customInstructions: string;
  interfaceLanguage: string;
  accentColor: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  productUpdates: boolean;
  displayName: string;
  username: string;
  voice: string;
  voiceRate: number;
  speechPlayback: boolean;
  memoryEnabled: boolean;
  enterToSend: boolean;
};
type Conversation = {
  id: string;
  title: string;
  messages: Array<{ role: string; content: string }>;
  updatedAt: number;
  archived?: boolean;
};
type CategoryId =
  | "General" | "Appearance" | "Notifications" | "Profile" | "Security and login"
  | "Account" | "Archived chats" | "Parental controls" | "Trusted contact" | "Voice"
  | "Storage" | "Personalization" | "Pets" | "Keyboard" | "Usage" | "Billing"
  | "Data controls" | "Integrations";

const preferencesKey = "puya.ai.preferences.v1";
const conversationsKey = "puya.ai.conversations.v2";
const modelOptions: Record<Provider, ModelOption[]> = {
  groq: [
    { value: "qwen/qwen3.8-27b", label: "PUYA Lite" },
    { value: "openai/gpt-oss-120b", label: "PUYA Ultra" },
  ],
  gemini: [
    { value: "gemini-3.8-flash", label: "PUYA Lite" },
    { value: "gemini-4-argon", label: "PUYA Ultra" },
  ],
};
const defaults: SettingsValues = {
  theme: "light",
  themePreference: "system",
  provider: "groq",
  model: "qwen/qwen3.8-27b",
  saveActivity: true,
  responseLanguage: "Automatic",
  responseStyle: "Friendly",
  manipuriScript: "Meitei Mayek",
  aboutYou: "",
  customInstructions: "",
  interfaceLanguage: "English",
  accentColor: "#7669d8",
  emailNotifications: false,
  pushNotifications: false,
  productUpdates: false,
  displayName: "",
  username: "",
  voice: "",
  voiceRate: 1,
  speechPlayback: false,
  memoryEnabled: true,
  enterToSend: true,
};
const personalCategories: Array<{ id: CategoryId; icon: LucideIcon }> = [
  { id: "General", icon: SlidersHorizontal },
  { id: "Appearance", icon: Moon },
  { id: "Notifications", icon: Bell },
  { id: "Profile", icon: UserRound },
  { id: "Security and login", icon: LockKeyhole },
  { id: "Account", icon: Fingerprint },
  { id: "Archived chats", icon: FileClock },
  { id: "Parental controls", icon: Shield },
  { id: "Trusted contact", icon: CircleHelp },
  { id: "Voice", icon: Volume2 },
  { id: "Storage", icon: Database },
  { id: "Personalization", icon: Sparkles },
  { id: "Pets", icon: PawPrint },
  { id: "Keyboard", icon: Keyboard },
  { id: "Usage", icon: Smartphone },
  { id: "Billing", icon: CreditCard },
  { id: "Data controls", icon: Shield },
];
const integrations: Array<{ id: CategoryId; icon: LucideIcon }> = [
  { id: "Integrations", icon: Link2 },
];

function readStoredSettings(): Partial<SettingsValues> {
  try {
    const stored = localStorage.getItem(preferencesKey);
    if (!stored) return {};
    const value = JSON.parse(stored) as Partial<SettingsValues>;
    const provider = value.provider === "gemini" ? "gemini" : "groq";
    return {
      ...value,
      provider,
      model: modelOptions[provider].some((option) => option.value === value.model)
        ? value.model
        : modelOptions[provider][0].value,
      themePreference: ["system", "light", "dark"].includes(value.themePreference ?? "")
        ? value.themePreference
        : value.theme === "dark" ? "dark" : "light",
    };
  } catch {
    return {};
  }
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="settings-row">
      <div className="settings-row-copy">
        <strong>{title}</strong>
        {description && <span>{description}</span>}
      </div>
      <div className="settings-row-control">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      className={`settings-toggle ${checked ? "is-on" : ""}`}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

function SelectControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="settings-select-wrap">
      <span className="sr-only">{label}</span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown size={14} aria-hidden="true" />
    </label>
  );
}

export function SettingsWorkspace() {
  const [values, setValues] = useState(defaults);
  const [active, setActive] = useState<CategoryId>("General");
  const [search, setSearch] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const stored = readStoredSettings();
    const themePreference = stored.themePreference ?? defaults.themePreference;
    const theme = themePreference === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      : themePreference;
    // Load persisted settings once after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues({ ...defaults, ...stored, theme, themePreference });
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty("--accent", stored.accentColor ?? defaults.accentColor);
    try {
      const saved = localStorage.getItem(conversationsKey);
      const parsed = saved ? JSON.parse(saved) as Conversation[] : [];
      setConversations(Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === "string") : []);
    } catch {
      setConversations([]);
      setNotice("Could not read saved conversations from this browser.");
    }
    if ("speechSynthesis" in window) {
      const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
      loadVoices();
      window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
      return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    }
  }, []);

  useEffect(() => {
    if (values.themePreference !== "system") return;
    const preference = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = (event: MediaQueryListEvent) => {
      document.documentElement.dataset.theme = event.matches ? "dark" : "light";
    };
    preference.addEventListener("change", applyTheme);
    return () => preference.removeEventListener("change", applyTheme);
  }, [values.themePreference]);

  const saveValues = useCallback((next: SettingsValues) => {
    setValues(next);
    try {
      localStorage.setItem(preferencesKey, JSON.stringify(next));
      const resolvedTheme = next.themePreference === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
        : next.themePreference;
      document.documentElement.dataset.theme = resolvedTheme;
      document.documentElement.style.setProperty("--accent", next.accentColor);
    } catch {
      setNotice("Your browser could not save this setting. Check available site storage.");
    }
  }, []);

  const update = useCallback(<K extends keyof SettingsValues>(key: K, value: SettingsValues[K]) => {
    if (key === "themePreference") {
      const preference = value as SettingsValues["themePreference"];
      saveValues({
        ...values,
        themePreference: preference,
        theme: preference === "dark" ? "dark" : preference === "light" ? "light" : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
      });
      return;
    }
    saveValues({ ...values, [key]: value });
  }, [saveValues, values]);

  const categories = useMemo(() => [...personalCategories, ...integrations].filter(({ id }) =>
    id.toLowerCase().includes(search.trim().toLowerCase()),
  ), [search]);
  const archived = conversations.filter((item) => item.archived);
  const storageBytes = (() => {
    if (typeof window === "undefined") return 0;
    let bytes = 0;
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key) bytes += key.length * 2 + (localStorage.getItem(key)?.length ?? 0) * 2;
    }
    return bytes;
  })();
  const savedMessageCount = conversations.reduce((sum, item) => sum + item.messages.length, 0);

  const saveConversations = (next: Conversation[]) => {
    setConversations(next);
    try {
      localStorage.setItem(conversationsKey, JSON.stringify(next));
    } catch {
      setNotice("Could not update saved conversations in this browser.");
    }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), settings: values, conversations }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "puya-ai-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Your browser data export has been downloaded.");
  };

  const deleteAllChats = () => {
    if (!window.confirm("Delete all saved conversations from this browser? This cannot be undone.")) return;
    saveConversations([]);
    setNotice("All saved conversations were deleted from this browser.");
  };

  const clearMemory = () => {
    if (!window.confirm("Clear your saved information and custom instructions?")) return;
    saveValues({ ...values, aboutYou: "", customInstructions: "", memoryEnabled: false });
    setNotice("Saved response information was cleared.");
  };

  const restoreChat = (id: string) => {
    saveConversations(conversations.map((item) => item.id === id ? { ...item, archived: false } : item));
    setNotice("Conversation restored.");
  };

  const deleteArchivedChat = (id: string) => {
    if (!window.confirm("Delete this archived conversation? This cannot be undone.")) return;
    saveConversations(conversations.filter((item) => item.id !== id));
    setNotice("Archived conversation deleted.");
  };

  const previewVoice = () => {
    if (!("speechSynthesis" in window)) {
      setNotice("Speech synthesis is not available in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Hello, I am PUYA AI. This is a preview of your selected voice.");
    utterance.rate = values.voiceRate;
    const voice = voices.find((item) => item.name === values.voice);
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  };

  const selectCategory = (category: CategoryId) => {
    setActive(category);
    setMobileNavOpen(false);
  };

  const renderPage = () => {
    switch (active) {
      case "General":
        return <>
          <SettingRow title="Interface language" description="Preference saved locally; interface translations are not enabled yet."><SelectControl label="Interface language" value={values.interfaceLanguage} options={["English", "Manipuri (Meiteilon)", "Hindi"].map((item) => ({ value: item, label: item }))} onChange={(value) => update("interfaceLanguage", value)} /></SettingRow>
          <SettingRow title="Default response language" description="Choose a response language or let PUYA detect it."><SelectControl label="Default response language" value={values.responseLanguage} options={["Automatic", "English", "Manipuri (Meiteilon)", "Hindi"].map((item) => ({ value: item, label: item }))} onChange={(value) => update("responseLanguage", value)} /></SettingRow>
          <SettingRow title="AI provider"><SelectControl label="AI provider" value={values.provider} options={[{ value: "groq", label: "PUYA AI" }, { value: "gemini", label: "Kanglei AI" }]} onChange={(value) => { const provider = value === "gemini" ? "gemini" : "groq"; saveValues({ ...values, provider, model: modelOptions[provider][0].value }); }} /></SettingRow>
          <SettingRow title="Default model" description="Lite is optimized for speed; Ultra for more complex tasks."><SelectControl label="Default model" value={values.model} options={modelOptions[values.provider]} onChange={(value) => update("model", value)} /></SettingRow>
          <SettingRow title="Save chat activity" description="Keep conversations in this browser's history."><Toggle label="Save chat activity" checked={values.saveActivity} onChange={(value) => update("saveActivity", value)} /></SettingRow>
        </>;
      case "Appearance":
        return <>
          <SettingRow title="Theme" description="Choose how PUYA AI looks on this device."><SelectControl label="Theme" value={values.themePreference} options={[{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} onChange={(value) => update("themePreference", value as SettingsValues["themePreference"])} /></SettingRow>
          <div className="settings-row settings-color-row"><div className="settings-row-copy"><strong>Accent color</strong><span>Used for selected and interactive elements in chat.</span></div><div className="settings-color-options">{["#7669d8", "#8b83cb", "#5488bd", "#548b72", "#bc765d"].map((color) => <button key={color} type="button" className={`color-swatch ${values.accentColor === color ? "color-selected" : ""}`} style={{ backgroundColor: color }} aria-label={`Set accent color ${color}`} aria-pressed={values.accentColor === color} onClick={() => update("accentColor", color)} />)}</div></div>
          <SettingRow title="Chat appearance" description="The interface uses a compact, high-contrast layout."><span className="settings-static">Minimal</span></SettingRow>
        </>;
      case "Notifications":
        return <>
          <SettingRow title="Email notifications" description="Email delivery requires an account and notification service."><Toggle label="Email notifications" checked={values.emailNotifications} onChange={(value) => update("emailNotifications", value)} /></SettingRow>
          <SettingRow title="Push notifications" description="Browser push delivery is not configured in this local app."><Toggle label="Push notifications" checked={values.pushNotifications} onChange={(value) => update("pushNotifications", value)} /></SettingRow>
          <SettingRow title="Product updates" description="Preference saved locally; no announcement email is sent."><Toggle label="Product updates" checked={values.productUpdates} onChange={(value) => update("productUpdates", value)} /></SettingRow>
        </>;
      case "Profile":
        return <>
          <SettingRow title="Display name" description="Saved on this browser only; your sign-in profile is managed by Clerk."><input className="settings-input" aria-label="Display name" maxLength={80} value={values.displayName} onChange={(event) => update("displayName", event.target.value)} placeholder="Your name" /></SettingRow>
          <SettingRow title="Username" description="Manage account profile information from the profile menu."><input className="settings-input" aria-label="Username" maxLength={40} value={values.username} onChange={(event) => update("username", event.target.value)} placeholder="Choose a username" /></SettingRow>
        </>;
      case "Security and login":
        return <Unavailable title="Sign-in security is managed by Clerk" detail="Use the profile menu in the chat sidebar to manage your sign-in account. PUYA AI does not store passwords or authentication tokens." />;
      case "Account":
        return <Unavailable title="Account sign-in is connected" detail="Clerk manages your sign-in account. Billing, subscription entitlements, and cross-device conversation sync are not configured; chat history and preferences remain in this browser." />;
      case "Archived chats":
        return archived.length === 0
          ? <div className="settings-empty"><FileClock size={23} /><strong>No archived chats</strong><span>Archive a conversation from its history row in the chat sidebar to see it here.</span></div>
          : <div className="archived-list">{archived.map((item) => <div className="archived-item" key={item.id}><div><strong>{item.title || "New chat"}</strong><span>{item.messages.length} messages</span></div><button type="button" className="settings-text-button" onClick={() => restoreChat(item.id)}>Restore</button><button type="button" className="settings-text-button danger-text" onClick={() => deleteArchivedChat(item.id)}>Delete</button></div>)}</div>;
      case "Parental controls":
        return <Unavailable title="Parental controls are unavailable" detail="This application does not currently have age verification, family accounts, or parental supervision services." />;
      case "Trusted contact":
        return <Unavailable title="Trusted contacts are unavailable" detail="Trusted-contact management requires a verified account and secure server-side contact storage, neither of which is configured." />;
      case "Voice":
        return <>
          <SettingRow title="Voice" description="Choose a voice available through your browser's speech engine."><SelectControl label="Voice" value={values.voice} options={[{ value: "", label: voices.length ? "System default" : "No voices available" }, ...voices.map((voice) => ({ value: voice.name, label: `${voice.name} (${voice.lang})` }))]} onChange={(value) => update("voice", value)} /></SettingRow>
          <SettingRow title="Speech rate" description="Adjust voice preview speed."><input aria-label="Speech rate" type="range" min="0.7" max="1.3" step="0.1" value={values.voiceRate} onChange={(event) => update("voiceRate", Number(event.target.value))} /><span className="settings-static">{values.voiceRate.toFixed(1)}×</span></SettingRow>
          <SettingRow title="Speech playback preference" description="Saved preference for future voice features."><Toggle label="Speech playback preference" checked={values.speechPlayback} onChange={(value) => update("speechPlayback", value)} /></SettingRow>
          <SettingRow title="Preview voice" description="Play a short sample using your selected browser voice."><button type="button" className="settings-button" onClick={previewVoice}><Volume2 size={14} /> Preview</button></SettingRow>
        </>;
      case "Storage":
        return <>
          <SettingRow title="Browser storage used" description="Approximate size of PUYA AI data in this browser."><span className="settings-static">{storageBytes < 1024 * 1024 ? `${(storageBytes / 1024).toFixed(1)} KB` : `${(storageBytes / 1024 / 1024).toFixed(2)} MB`}</span></SettingRow>
          <SettingRow title="Saved conversations" description={`${conversations.length} conversations · ${savedMessageCount} messages`}><button type="button" className="settings-text-button danger-text" onClick={deleteAllChats}>Clear conversations</button></SettingRow>
        </>;
      case "Personalization":
        return <>
          <SettingRow title="Memory" description="Use saved information as context for future replies."><Toggle label="Memory" checked={values.memoryEnabled} onChange={(value) => update("memoryEnabled", value)} /></SettingRow>
          <SettingRow title="Response style" description="Choose the tone PUYA should use by default."><SelectControl label="Response style" value={values.responseStyle} options={["Friendly", "Professional", "Concise", "Detailed", "Academic", "Creative"].map((item) => ({ value: item, label: item }))} onChange={(value) => update("responseStyle", value)} /></SettingRow>
          <SettingRow title="Manipuri script" description="Script used for Manipuri (Meiteilon) responses."><SelectControl label="Manipuri script" value={values.manipuriScript} options={["Meitei Mayek", "Romanised", "English transliteration"].map((item) => ({ value: item, label: item }))} onChange={(value) => update("manipuriScript", value)} /></SettingRow>
          <label className="settings-field"><span>What should PUYA know about you?</span><textarea rows={3} maxLength={1000} value={values.aboutYou} onChange={(event) => update("aboutYou", event.target.value)} placeholder="Your interests, work, or goals…" /></label>
          <label className="settings-field"><span>Custom instructions</span><textarea rows={3} maxLength={1000} value={values.customInstructions} onChange={(event) => update("customInstructions", event.target.value)} placeholder="How should PUYA respond?" /></label>
          <button type="button" className="settings-text-button danger-text" onClick={clearMemory}>Clear saved information</button>
        </>;
      case "Pets":
        return <Unavailable title="No pet settings are available" detail="Pet personalities are not supported in this PUYA AI app." />;
      case "Keyboard":
        return <>
          <SettingRow title="Enter sends message" description="Press Enter to send, or Shift + Enter for a new line."><Toggle label="Enter sends message" checked={values.enterToSend} onChange={(value) => update("enterToSend", value)} /></SettingRow>
          <div className="shortcut-table"><div><span>New chat</span><kbd>⌘ / Ctrl + K</kbd></div>{values.enterToSend && <div><span>Send message</span><kbd>Enter</kbd></div>}<div><span>New line</span><kbd>Shift + Enter</kbd></div></div>
        </>;
      case "Usage":
        return <>
          <SettingRow title="Conversations in this browser" description="Local-only total, including archived chats."><span className="settings-static">{conversations.length}</span></SettingRow>
          <SettingRow title="Messages stored" description="User and assistant messages in local chat history."><span className="settings-static">{savedMessageCount}</span></SettingRow>
          <SettingRow title="Provider" description="Usage limits depend on your selected provider account."><span className="settings-static">{values.provider === "groq" ? "PUYA AI" : "Kanglei AI"}</span></SettingRow>
        </>;
      case "Billing":
        return <Unavailable title="Billing is not connected" detail="There is no active paid plan or payment method in this local starter. Secure subscription management and billing history require a payment provider and authenticated backend." />;
      case "Data controls":
        return <>
          <SettingRow title="Save chat history" description="When off, new conversations are not written to this browser's saved history."><Toggle label="Save chat history" checked={values.saveActivity} onChange={(value) => update("saveActivity", value)} /></SettingRow>
          <SettingRow title="Export your data" description="Download local preferences and saved conversations as JSON."><button type="button" className="settings-button" onClick={exportData}><Download size={14} /> Export data</button></SettingRow>
          <SettingRow title="Delete chat history" description="Permanently remove conversations saved in this browser."><button type="button" className="settings-text-button danger-text" onClick={deleteAllChats}>Delete all chats</button></SettingRow>
          <SettingRow title="Memory and personalization" description="Remove saved response context and custom instructions."><button type="button" className="settings-text-button danger-text" onClick={clearMemory}>Clear saved information</button></SettingRow>
          <SettingRow title="Privacy policy" description="Review how PUYA AI handles information."><Link className="settings-text-button" href="/privacy-policy">Read privacy policy</Link></SettingRow>
          <p className="settings-disclaimer">Chats and preferences stay in this browser. Prompts are sent to the configured AI provider to generate responses. Deleting browser data does not delete data held by a provider.</p>
        </>;
      case "Integrations":
        return <Unavailable title="No external apps are connected" detail="Integrations are not configured. Provider API keys are managed on the server and are never entered or stored in browser settings." />;
    }
  };

  const categoryButton = ({ id, icon: Icon }: { id: CategoryId; icon: LucideIcon }) => (
    <button
      className={`settings-nav-item ${active === id ? "settings-nav-active" : ""}`}
      key={id}
      type="button"
      aria-current={active === id ? "page" : undefined}
      onClick={() => selectCategory(id)}
    >
      <Icon size={16} strokeWidth={1.7} />
      <span>{id}</span>
    </button>
  );

  return (
    <main className="settings-app">
      {mobileNavOpen && <button className="settings-scrim" type="button" aria-label="Close settings navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`settings-sidebar ${mobileNavOpen ? "settings-sidebar-open" : ""}`}>
        <Link className="settings-back" href="/"><ArrowLeft size={17} /> <span>Back to PUYA AI</span></Link>
        <label className="settings-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search settings" aria-label="Search settings" /></label>
        <nav className="settings-nav" aria-label="Settings categories">
          {categories.some(({ id }) => personalCategories.some((item) => item.id === id)) && <h2>Personal</h2>}
          {categories.filter(({ id }) => personalCategories.some((item) => item.id === id)).map(categoryButton)}
          {categories.some(({ id }) => integrations.some((item) => item.id === id)) && <h2 className="integrations-heading">Integrations</h2>}
          {categories.filter(({ id }) => integrations.some((item) => item.id === id)).map(categoryButton)}
          {categories.length === 0 && <p className="settings-no-results">No matching settings.</p>}
        </nav>
        <div className="settings-sidebar-footer"><span className="settings-status-dot" /> Browser-local preferences</div>
      </aside>
      <section className="settings-main">
        <header className="settings-mobile-header">
          <button className="settings-icon-button" type="button" aria-label="Open settings navigation" onClick={() => setMobileNavOpen(true)}><Menu size={19} /></button>
          <span>Settings</span>
          <Link className="settings-icon-button" href="/" aria-label="Back to chat"><ArrowLeft size={18} /></Link>
        </header>
        <div className="settings-content">
          <div className="settings-content-heading">
            <p>SETTINGS</p>
            <h1>{active}</h1>
          </div>
          {notice && <div className="settings-notice" role="status">{notice}<button type="button" aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={14} /></button></div>}
          <section className="settings-section" aria-label={`${active} settings`}>
            {renderPage()}
          </section>
          {active !== "Security and login" && active !== "Account" && active !== "Billing" && active !== "Integrations" && (
            <p className="settings-page-footnote">Changes are saved automatically on this device.</p>
          )}
        </div>
      </section>
    </main>
  );
}

function Unavailable({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="settings-unavailable">
      <div className="settings-unavailable-icon"><Globe size={19} /></div>
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}
