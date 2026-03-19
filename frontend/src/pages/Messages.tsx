import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, ArrowLeft, MessageCircle, ChevronLeft, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  family_user_id: string;
  nanny_user_id: string;
  last_message_at: string;
  other_name: string;
  other_avatar: string | null;
  unread_count: number;
  last_message?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

const MESSAGES_PAGE_SIZE = 50;

const Messages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;
    const { data: convos } = await supabase
      .from("conversations")
      .select("*")
      .or(`family_user_id.eq.${user.id},nanny_user_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (!convos || convos.length === 0) { setLoading(false); return; }

    const otherIds = convos.map(c => c.family_user_id === user.id ? c.nanny_user_id : c.family_user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", otherIds);

    // Batch fetch last messages and unread counts for all conversations at once
    const convoIds = convos.map(c => c.id);

    // Get last message per conversation (fetch recent messages in bulk)
    const { data: recentMessages } = await supabase
      .from("messages")
      .select("conversation_id, content, created_at")
      .in("conversation_id", convoIds)
      .order("created_at", { ascending: false });

    // Build last-message map (first occurrence per conversation_id is the latest)
    const lastMessageMap: Record<string, string> = {};
    recentMessages?.forEach(m => {
      if (!lastMessageMap[m.conversation_id]) {
        lastMessageMap[m.conversation_id] = m.content;
      }
    });

    // Get unread counts in bulk
    const { data: unreadMessages } = await supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", convoIds)
      .eq("read", false)
      .neq("sender_id", user.id);

    const unreadCountMap: Record<string, number> = {};
    unreadMessages?.forEach(m => {
      unreadCountMap[m.conversation_id] = (unreadCountMap[m.conversation_id] || 0) + 1;
    });

    const enriched: Conversation[] = convos.map((c) => {
      const otherId = c.family_user_id === user.id ? c.nanny_user_id : c.family_user_id;
      const prof = profiles?.find(p => p.user_id === otherId);

      return {
        ...c,
        other_name: prof?.full_name || "User",
        other_avatar: prof?.avatar_url || null,
        unread_count: unreadCountMap[c.id] || 0,
        last_message: lastMessageMap[c.id],
      };
    });

    setConversations(enriched);
    setLoading(false);
  };

  const openConversation = async (convo: Conversation) => {
    setActiveConvo(convo);
    setMessages([]);
    setHasOlderMessages(false);

    const { data, count } = await supabase
      .from("messages")
      .select("*", { count: "exact" })
      .eq("conversation_id", convo.id)
      .order("created_at", { ascending: false })
      .limit(MESSAGES_PAGE_SIZE);

    const msgs = (data || []).reverse();
    setMessages(msgs);
    setHasOlderMessages((count || 0) > MESSAGES_PAGE_SIZE);

    // Mark unread as read
    if (user) {
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("conversation_id", convo.id)
        .neq("sender_id", user.id)
        .eq("read", false);
    }

    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const loadOlderMessages = useCallback(async () => {
    if (!activeConvo || loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);

    const oldestMessage = messages[0];
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", activeConvo.id)
      .lt("created_at", oldestMessage.created_at)
      .order("created_at", { ascending: false })
      .limit(MESSAGES_PAGE_SIZE);

    const olderMsgs = (data || []).reverse();
    if (olderMsgs.length < MESSAGES_PAGE_SIZE) setHasOlderMessages(false);

    // Preserve scroll position
    const container = messagesContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;

    setMessages(prev => [...olderMsgs, ...prev]);

    requestAnimationFrame(() => {
      if (container) {
        container.scrollTop = container.scrollHeight - prevScrollHeight;
      }
    });

    setLoadingOlder(false);
  }, [activeConvo, loadingOlder, messages]);

  // Realtime subscription
  useEffect(() => {
    if (!activeConvo) return;

    const channel = supabase
      .channel(`messages-${activeConvo.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${activeConvo.id}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => [...prev, newMsg]);
        if (user && newMsg.sender_id !== user.id) {
          supabase.from("messages").update({ read: true }).eq("id", newMsg.id);
        }
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConvo, user]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConvo || !user) return;
    const content = newMessage.trim();
    setNewMessage("");

    // AI safety check
    try {
      const { data: safetyResult } = await supabase.functions.invoke("ai-safety-check", {
        body: { message_content: content },
      });
      if (safetyResult?.action === "block") {
        setNewMessage(content);
        const { toast } = await import("@/hooks/use-toast");
        toast({ title: "Message blocked", description: safetyResult.warning_message || "This message was flagged for safety concerns.", variant: "destructive" });
        return;
      }
      if (safetyResult?.action === "warn") {
        const { toast } = await import("@/hooks/use-toast");
        toast({ title: "Safety Notice", description: safetyResult.warning_message || "Please keep conversations on-platform for your safety." });
      }
    } catch { /* Allow message if safety check fails */ }

    await supabase.from("messages").insert({
      conversation_id: activeConvo.id,
      sender_id: user.id,
      content,
    });

    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", activeConvo.id);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activeConvo && (
              <button onClick={() => setActiveConvo(null)} className="sm:hidden text-muted-foreground">
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <Link to="/" className="font-display text-xl font-bold text-primary">NannyElite</Link>
          </div>
          <Link to="/dashboard"><Button variant="outline" size="sm" className="rounded-full">Dashboard</Button></Link>
        </div>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full flex overflow-hidden" style={{ height: "calc(100vh - 73px)" }}>
        {/* Conversation List */}
        <div className={`w-full sm:w-80 border-r border-border bg-card flex-shrink-0 overflow-y-auto ${activeConvo ? "hidden sm:block" : ""}`}>
          <div className="p-4 border-b border-border">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <MessageCircle className="h-5 w-5" /> Messages
            </h2>
          </div>
          {loading ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No conversations yet. Start a conversation from a nanny's profile!
            </div>
          ) : (
            conversations.map(c => (
              <button
                key={c.id}
                onClick={() => openConversation(c)}
                className={`w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors border-b border-border ${
                  activeConvo?.id === c.id ? "bg-muted" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {c.other_avatar ? (
                    <img src={c.other_avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold text-primary">{c.other_name[0]}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm text-foreground truncate">{c.other_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: false })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.last_message || "No messages yet"}</p>
                </div>
                {c.unread_count > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-xs rounded-full h-5 min-w-[20px] flex items-center justify-center">
                    {c.unread_count}
                  </Badge>
                )}
              </button>
            ))
          )}
        </div>

        {/* Message Thread */}
        <div className={`flex-1 flex flex-col ${!activeConvo ? "hidden sm:flex" : "flex"}`}>
          {!activeConvo ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a conversation to start messaging</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-border bg-card flex items-center gap-3">
                <button onClick={() => setActiveConvo(null)} className="hidden max-sm:block text-muted-foreground">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {activeConvo.other_avatar ? (
                    <img src={activeConvo.other_avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-semibold text-primary">{activeConvo.other_name[0]}</span>
                  )}
                </div>
                <span className="font-medium text-foreground">{activeConvo.other_name}</span>
              </div>

              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary">
                {hasOlderMessages && (
                  <div className="text-center py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadOlderMessages}
                      disabled={loadingOlder}
                      className="text-xs gap-1"
                    >
                      {loadingOlder ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      {loadingOlder ? "Loading..." : "Load older messages"}
                    </Button>
                  </div>
                )}
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_id === user.id ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                      m.sender_id === user.id
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card text-foreground border border-border rounded-bl-md"
                    }`}>
                      <p>{m.content}</p>
                      <p className={`text-[10px] mt-1 ${
                        m.sender_id === user.id ? "text-primary-foreground/60" : "text-muted-foreground"
                      }`}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 bg-card border-t border-border">
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!newMessage.trim()} className="rounded-full">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
