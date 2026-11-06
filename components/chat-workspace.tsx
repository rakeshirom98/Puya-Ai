"use client";

import {
  ArrowUp,
  Archive,
  Check,
  ChevronDown,
  Command,
  FileImage,
  Globe2,
  Menu,
  Moon,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Show, SignInButton, SignOutButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  attachmentName?: string;
};
type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
  archived?: boolean;
};
type Mode = "Chat" | "Reasoning" | "Search";
type Preferences = {
  theme: "light" | "dark";
  themePreference: "system" | "light" | "dark";
  accentColor: string;
  displayName: string;
  provider: "groq" | "gemini";
  model: string;
  saveActivity: boolean;
  enterToSend: boolean;
  memoryEnabled: boolean;
  responseLanguage: string;
  responseStyle: string;
  manipuriScript: string;
  aboutYou: string;
  customInstructions: string;
};

const modelOptions: Record<Preferences["provider"], Array<{ value: string; label: string }>> = {
  groq: [
    { value: "qwen/qwen3.8-27b", label: "PUYA Lite" },
    { value: "openai/gpt-oss-120b", label: "PUYA Ultra" },
  ],
  gemini: [
    { value: "gemini-3.8-flash", label: "PUYA Lite" },
    { value: "gemini-4-argon", label: "PUYA Ultra" },
  ],
};

const conversationsKey = "puya.ai.conversations.v2";
const preferencesKey = "puya.ai.preferences.v1";
const defaultPreferences: Preferences = {
  theme: "light",
  themePreference: "system",
  accentColor: "#7669d8",
  displayName: "",
  provider: "groq",
  model: "qwen/qwen3.8-27b",
  saveActivity: true,
  enterToSend: true,
  memoryEnabled: true,
  responseLanguage: "Automatic",
  responseStyle: "Friendly",
  manipuriScript: "Meitei Mayek",
  aboutYou: "",
  customInstructions: "",
};
const suggestions = [
  { icon: "✳", title: "Explore an idea", detail: "Make the complex feel clear", prompt: "Explain a fascinating idea in a simple, memorable way.", color: "lavender" },
  { icon: "✎", title: "Write something", detail: "Find just the right words", prompt: "Help me write something clear, thoughtful, and engaging.", color: "peach" },
  { icon: "ꯃ", title: "Speak Meiteilon", detail: "Manipuri · Coming soon", prompt: "ꯃꯤꯇꯩꯂꯣꯟꯗ ꯉꯥꯡꯉꯨ", color: "mint" },
  { icon: "⌁", title: "Learn something", detail: "One good question at a time", prompt: "Give me a practical plan to learn something new this week.", color: "blue" },
];

function readLocal<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch {
    return fallback;
  }
}

async function readError(response: Response) {
  try {
    const body = await response.json() as { error?: string };
    return body.error ?? `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

function makeConversation(content: string): Conversation {
  return {
    id: crypto.randomUUID(),
    title: content.replace(/\s+/g, " ").slice(0, 48),
    messages: [],
    updatedAt: Date.now(),
  };
}

function withConversationMessages(conversation: Conversation, messages: ChatMessage[]): Conversation {
  return { ...conversation, messages, updatedAt: Date.now() };
}

async function readAIStream(
  body: ReadableStream<Uint8Array>,
  onText: (content: string) => void,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const rawEvent of events) {
      const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data:"));
      if (!dataLine) continue;
      const data = dataLine.slice(5).trim();
      if (data === "[DONE]") continue;
      let chunk: { choices?: Array<{ delta?: { content?: string } }>; error?: { message?: string } };
      try {
        chunk = JSON.parse(data);
      } catch {
        continue;
      }
      if (chunk.error) throw new Error(chunk.error.message ?? "The AI provider returned an error.");
      const text = chunk.choices?.[0]?.delta?.content;
      if (typeof text !== "string") continue;
      answer += text;
      onText(answer);
    }
  }
  return answer;
}

export function ChatWorkspace() {
  const { user, isLoaded: isClerkLoaded } = useUser();
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("Chat");
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = conversations.find((item) => item.id === activeId) ?? null;
  const orderedConversations = useMemo(
    () => [...conversations]
      .filter((item) => item.title.toLowerCase().includes(historyFilter.toLowerCase()))
      .filter((item) => !item.archived)
      .sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations, historyFilter],
  );

  useEffect(() => {
    const loadedPreferences = readLocal<Preferences>(preferencesKey, defaultPreferences);
    const loadedConversations = readLocal<Conversation[]>(conversationsKey, []);
    const provider = loadedPreferences.provider === "gemini" ? "gemini" : "groq";
    const model = modelOptions[provider].some((option) => option.value === loadedPreferences.model)
      ? loadedPreferences.model
      : provider === "gemini" && loadedPreferences.model === "gemini-4-argon"
        ? "gemini-4-argon"
        : provider === "groq" && loadedPreferences.model === "openai/gpt-oss-120b"
          ? "openai/gpt-oss-120b"
          : modelOptions[provider][0].value;
    // Load account-local state once after client hydration.
    const themePreference = ["system", "light", "dark"].includes(loadedPreferences.themePreference)
      ? loadedPreferences.themePreference
      : loadedPreferences.theme === "dark" ? "dark" : "light";
    const theme = themePreference === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      : themePreference;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreferences({ ...defaultPreferences, ...loadedPreferences, provider, model, theme, themePreference });
    setConversations(Array.isArray(loadedConversations)
      ? loadedConversations.filter((item) =>
        item && typeof item.id === "string" && Array.isArray(item.messages),
      )
      : []);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty("--accent", loadedPreferences.accentColor ?? defaultPreferences.accentColor);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(preferencesKey, JSON.stringify(preferences));
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.style.setProperty("--accent", preferences.accentColor);
  }, [hydrated, preferences]);

  useEffect(() => {
    if (!hydrated || preferences.themePreference !== "system") return;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = (event: MediaQueryListEvent) => {
      const theme = event.matches ? "dark" : "light";
      document.documentElement.dataset.theme = theme;
      setPreferences((current) => current.themePreference === "system" ? { ...current, theme } : current);
    };
    systemTheme.addEventListener("change", applyTheme);
    return () => systemTheme.removeEventListener("change", applyTheme);
  }, [hydrated, preferences.themePreference]);

  useEffect(() => {
    if (!hydrated) return;
    if (preferences.saveActivity) {
      localStorage.setItem(conversationsKey, JSON.stringify(conversations.slice(0, 100)));
    }
  }, [conversations, hydrated, preferences.saveActivity]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [active?.messages, sending]);

  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 6000);
  }, []);

  const startNewChat = useCallback(() => {
    setActiveId(null);
    setPrompt("");
    setMode("Chat");
    setSidebarOpen(false);
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        startNewChat();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [startNewChat]);

  const updatePreference = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    if (key === "theme") {
      const theme = value as Preferences["theme"];
      setPreferences((current) => ({ ...current, theme, themePreference: theme }));
      return;
    }
    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const deleteConversation = (id: string) => {
    setConversations((current) => current.filter((item) => item.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const archiveConversation = (id: string) => {
    setConversations((current) => current.map((item) =>
      item.id === id ? { ...item, archived: true, updatedAt: Date.now() } : item,
    ));
    if (activeId === id) setActiveId(null);
  };

  const copyText = async (content: string, key: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(key);
      setTimeout(() => setCopied(null), 1400);
    } catch {
      showNotice("Clipboard access is unavailable in this browser.");
    }
  };

  const sendMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const content = prompt.trim();
    if ((!content && !attachment) || sending) return;
    const imageFile = attachment;
    let image: { mimeType: string; data: string } | undefined;
    if (imageFile) {
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Could not read the selected image."));
          reader.readAsDataURL(imageFile);
        });
        image = {
          mimeType: imageFile.type,
          data: dataUrl.split(",")[1] ?? "",
        };
      } catch (error) {
        showNotice(error instanceof Error ? error.message : "Could not read the selected image.");
        return;
      }
    }
    const userContent = content || `Please analyze the attached image (${imageFile?.name ?? "image"}).`;

    const currentConversation = active ?? makeConversation(userContent);
    const priorMessages = currentConversation.messages;
    const pendingMessages: ChatMessage[] = [
      ...priorMessages,
      {
        role: "user",
        content: userContent,
        ...(imageFile ? { attachmentName: imageFile.name } : {}),
      },
    ];
    const pendingConversation = withConversationMessages(currentConversation, pendingMessages);
    setConversations((current) => [
      pendingConversation,
      ...current.filter((item) => item.id !== pendingConversation.id),
    ]);
    setActiveId(pendingConversation.id);
    setSending(true);
    setPrompt("");
    setAttachment(null);

    try {
      const result = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: pendingMessages.slice(-40),
          mode,
          provider: preferences.provider,
          model: preferences.model,
          preferences,
          image,
        }),
      });
      if (!result.ok) throw new Error(await readError(result));
      if (!result.body) throw new Error("Streaming is unavailable in this browser.");

      const assistantMessage: ChatMessage = { role: "assistant", content: "" };
      setConversations((current) => current.map((item) =>
        item.id === pendingConversation.id
          ? { ...item, messages: [...pendingMessages, assistantMessage] }
          : item,
      ));

      const answer = await readAIStream(result.body, (content) => {
          setConversations((current) => current.map((item) =>
            item.id === pendingConversation.id
              ? { ...item, messages: [...pendingMessages, { role: "assistant", content }] }
              : item,
          ));
      });
      if (!answer) throw new Error("The AI provider returned an empty response. Please try again.");
      setConversations((current) => current.map((item) =>
        item.id === pendingConversation.id
          ? withConversationMessages(item, [...pendingMessages, { role: "assistant", content: answer }])
          : item,
      ));
    } catch (error) {
      setConversations((current) => current.map((item) =>
        item.id === pendingConversation.id && item.messages.at(-1)?.content === ""
          ? { ...item, messages: item.messages.slice(0, -1) }
          : item,
      ));
      showNotice(error instanceof Error ? error.message : "Could not complete the request.");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const onPromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (preferences.enterToSend && event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <main className="app-shell">
      {sidebarOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <Link className="brand" href="/" aria-label="PUYA AI home">
            <Image className="brand-mark" src="/puya-logo.png" alt="" width={40} height={40} priority />
            <span><strong>PUYA AI</strong><small>INTELLIGENCE, WITHOUT BORDERS</small></span>
          </Link>
          <button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar"><X size={18} /></button>
        </div>
        <button className="new-chat" onClick={startNewChat}><Plus size={17} /> New chat <kbd><Command size={10} /> K</kbd></button>
        <div className="sidebar-heading">YOUR SPACE</div>
        <label className="history-search"><Search size={14} /><input value={historyFilter} onChange={(event) => setHistoryFilter(event.target.value)} placeholder="Search conversations" /></label>
        <div className="history-list">
          {orderedConversations.length === 0
            ? <p className="history-empty">{historyFilter ? "No matching conversations." : "Your conversations will appear here. They are saved only in this browser."}</p>
            : orderedConversations.map((conversation) => (
              <div className={`history-row ${activeId === conversation.id ? "history-active" : ""}`} key={conversation.id}>
                <button className="history-title" onClick={() => { setActiveId(conversation.id); setSidebarOpen(false); }}>{conversation.title || "New chat"}</button>
                <button className="archive-chat" onClick={() => archiveConversation(conversation.id)} aria-label={`Archive ${conversation.title}`} title="Archive conversation"><Archive size={13} /></button>
                <button className="delete-chat" onClick={() => deleteConversation(conversation.id)} aria-label={`Delete ${conversation.title}`}><Trash2 size={13} /></button>
              </div>
            ))}
        </div>
        <div className="sidebar-footer">
          <Show when="signed-in">
            <div className="profile-identity">
              <UserButton />
              <span className="profile-copy">
                <strong>{isClerkLoaded ? user?.fullName || user?.primaryEmailAddress?.emailAddress || "Your account" : "PUYA AI"}</strong>
                <SignOutButton redirectUrl="/sign-in">
                  <button className="sidebar-logout" type="button">Log out</button>
                </SignOutButton>
              </span>
            </div>
          </Show>
          <Show when="signed-out">
            <div className="auth-actions">
              <SignInButton mode="redirect"><button className="sidebar-auth-button" type="button">Sign in</button></SignInButton>
              <SignUpButton mode="redirect"><button className="sidebar-auth-button sidebar-auth-primary" type="button">Create account</button></SignUpButton>
            </div>
          </Show>
          <Link className="sidebar-settings" href="/settings" aria-label="Settings" title="Settings">
            <Settings2 size={17} />
          </Link>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
          <div className="model-control">
            <span className="model-dot" />
            <span>PUYA</span>
            <select aria-label="AI model" value={preferences.model} onChange={(event) => updatePreference("model", event.target.value)}>
              {modelOptions[preferences.provider].map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <ChevronDown size={13} className="select-chevron" />
          </div>
          <div className="top-actions">
            <button className="icon-button" onClick={() => updatePreference("theme", preferences.theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
              {preferences.theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </header>

        <div className="workspace-body" ref={scrollRef}>
          {active?.messages.length ? (
            <div className="messages">
              {active.messages.map((message, index) => {
                const messageKey = `${active.id}-${index}`;
                return (
                  <article className={`message ${message.role}`} key={messageKey}>
                    {message.role === "assistant" && <span className="message-avatar">ꯄ</span>}
                    <div className="message-content">
                      {message.attachmentName && <div className="message-attachment"><FileImage size={14} /><span>{message.attachmentName}</span></div>}
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                        pre: ({ children }) => <>{children}</>,
                        code: ({ children, className, ...props }) => {
                          const code = String(children).replace(/\n$/, "");
                          return className?.startsWith("language-") ? (
                            <div className="code-block">
                              <div className="code-toolbar"><span>{className.slice(9) || "Code"}</span><button onClick={() => void copyText(code, messageKey)}>{copied === messageKey ? <Check size={12} /> : "Copy"}</button></div>
                              <pre><code className={className} {...props}>{children}</code></pre>
                            </div>
                          ) : <code className={className} {...props}>{children}</code>;
                        },
                      }}>{message.content}</ReactMarkdown>
                      {message.role === "assistant" && <button className="copy-answer" onClick={() => void copyText(message.content, messageKey)}>{copied === messageKey ? <Check size={13} /> : "Copy response"}</button>}
                    </div>
                  </article>
                );
              })}
              {sending && <div className="thinking"><span className="message-avatar">ꯄ</span><span className="typing"><i /><i /><i /></span></div>}
            </div>
          ) : (
            <section className="welcome">
              <Image className="welcome-mark" src="/puya-logo.png" alt="PUYA AI logo" width={68} height={68} priority />
              <p className="eyebrow">YOUR THOUGHTFUL AI COMPANION</p>
              <h1>What’s on your mind<span>?</span></h1>
              <p className="welcome-copy">A little curiosity can take you anywhere.<br className="desktop-break" /> Ask anything — let’s explore.</p>
              <div className="suggestions">
                {suggestions.map((item) => (
                  <button className="suggestion" key={item.title} disabled={item.title === "Speak Meiteilon"} onClick={() => { setPrompt(item.prompt); textareaRef.current?.focus(); }}>
                    <span className={`suggestion-icon ${item.color}`}>{item.icon}</span>
                    <span className="suggestion-text"><strong>{item.title}</strong><small>{item.detail}</small></span>
                    <span className="suggestion-arrow">↗</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <footer className="composer-wrap">
          <div className="mode-row" aria-label="Chat mode">
            {(["Chat", "Reasoning", "Search"] as const).map((item) => (
              <button className={`mode-chip ${mode === item ? "mode-selected" : ""}`} key={item} onClick={() => setMode(item)}>{item === "Reasoning" ? <Sparkles size={13} /> : item === "Search" ? <Globe2 size={13} /> : null}{item === "Search" ? "Web search" : item}</button>
            ))}
            <button className="mode-chip mode-coming-soon" type="button" disabled title="Manipuri mode is coming soon">
              <span>ꯃ</span> Manipuri · Coming soon
            </button>
          </div>
          <form className="composer" onSubmit={(event) => void sendMessage(event)}>
            <label htmlFor="prompt" className="sr-only">Message PUYA AI</label>
            <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            aria-label="Attach an image"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
                showNotice("Choose a PNG, JPEG, WebP, or GIF image.");
                return;
              }
              if (file.size > 5 * 1024 * 1024) {
                showNotice("Choose an image smaller than 5 MB.");
                return;
              }
              setAttachment(file);
            }}
            />
            {attachment && <div className="attachment-chip"><FileImage size={14} /><span>{attachment.name}</span><button type="button" onClick={() => setAttachment(null)} aria-label="Remove attached image"><X size={13} /></button></div>}
            <textarea id="prompt" ref={textareaRef} rows={1} maxLength={20_000} value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={onPromptKeyDown} placeholder="Message PUYA AI…" disabled={sending} />
            <div className="composer-bottom"><div className="composer-actions"><button type="button" className="attach-button" onClick={() => fileInputRef.current?.click()} disabled={sending} aria-label="Attach image"><FileImage size={16} /></button><span className="composer-hint"><Sparkles size={12} /> Here to help you think things through</span></div><button className="send-button" type="submit" disabled={sending || (!prompt.trim() && !attachment)} aria-label="Send message">{sending ? <span className="send-spinner" /> : <ArrowUp size={18} />}</button></div>
          </form>
          <p className="disclaimer">{notice || "PUYA can make mistakes. Check important information."}</p>
        </footer>
      </section>
    </main>
  );
}
