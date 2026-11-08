import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform,
  Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View
} from "react-native";
import { supabase } from "./src/supabase";

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) loadConversations();
    else { setConversations([]); setMessages([]); setConversationId(null); }
  }, [session]);

  async function authenticate() {
    setNotice("");
    if (!email.trim() || password.length < 6) {
      setNotice("Enter your email and a password with at least 6 characters.");
      return;
    }
    setBusy(true);
    const result = mode === "signup"
      ? await supabase.auth.signUp({ email: email.trim(), password })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (result.error) setNotice(result.error.message);
    else if (mode === "signup" && !result.data.session)
      setNotice("Account created. Check your email to confirm it, then sign in.");
    else setNotice("You're signed in.");
  }

  async function loadConversations() {
    const { data, error } = await supabase.from("conversations")
      .select("id,title,created_at").order("created_at", { ascending: false });
    if (error) setNotice(error.message);
    else setConversations(data || []);
  }

  async function openConversation(id) {
    setConversationId(id);
    const { data, error } = await supabase.from("messages")
      .select("id,role,content,created_at").eq("conversation_id", id)
      .order("created_at", { ascending: true });
    if (error) setNotice(error.message);
    else setMessages(data || []);
  }

  async function newConversation() {
    setConversationId(null);
    setMessages([]);
    setNotice("Start typing to create a new conversation.");
  }

  async function sendMessage() {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    setNotice("");
    const optimistic = [...messages, { id: String(Date.now()), role: "user", content: text }];
    setMessages(optimistic);
    setBusy(true);
    try {
      let id = conversationId;
      if (!id) {
        const { data, error } = await supabase.from("conversations")
          .insert({ user_id: session.user.id, title: text.slice(0, 60) })
          .select("id").single();
        if (error) throw error;
        id = data.id;
        setConversationId(id);
      }
      const { error: saveError } = await supabase.from("messages")
        .insert({ conversation_id: id, user_id: session.user.id, role: "user", content: text });
      if (saveError) throw saveError;

      const { data: history, error: historyError } = await supabase.from("messages")
        .select("role,content").eq("conversation_id", id)
        .order("created_at", { ascending: true }).limit(30);
      if (historyError) throw historyError;

      const { data: answer, error: aiError } = await supabase.functions.invoke("chat", {
        body: { messages: history || [] }
      });
      if (aiError) throw aiError;
      if (!answer?.reply) throw new Error("The AI did not return a reply. Check your backend setup.");
      const { error: assistantSaveError } = await supabase.from("messages")
        .insert({ conversation_id: id, user_id: session.user.id, role: "assistant", content: answer.reply });
      if (assistantSaveError) throw assistantSaveError;
      setMessages([...optimistic, { id: String(Date.now() + 1), role: "assistant", content: answer.reply }]);
      loadConversations();
    } catch (e) {
      setNotice(e.message || "Something went wrong.");
    } finally { setBusy(false); }
  }

  if (loading) return <Centered><ActivityIndicator size="large" color="#8b5cf6" /></Centered>;

  if (!session) return (
    <SafeAreaView style={s.page}>
      <View style={s.authCard}>
        <Text style={s.logo}>KIDUS AI</Text>
        <Text style={s.subtitle}>Your personal AI assistant</Text>
        <Text style={s.heading}>{mode === "signup" ? "Create your account" : "Welcome back"}</Text>
        <TextInput style={s.input} placeholder="Email address" placeholderTextColor="#8b8fa3"
          autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={s.input} placeholder="Password (6+ characters)" placeholderTextColor="#8b8fa3"
          secureTextEntry value={password} onChangeText={setPassword} />
        {!!notice && <Text style={s.notice}>{notice}</Text>}
        <Pressable style={s.primary} onPress={authenticate} disabled={busy}>
          {busy ? <ActivityIndicator color="white" /> : <Text style={s.primaryText}>{mode === "signup" ? "Create account" : "Sign in"}</Text>}
        </Pressable>
        <Pressable onPress={() => { setMode(mode === "signup" ? "signin" : "signup"); setNotice(""); }}>
          <Text style={s.switch}>{mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.page}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.header}>
          <View><Text style={s.logoSmall}>KIDUS AI</Text><Text style={s.subtitleSmall}>Your personal AI assistant</Text></View>
          <Pressable onPress={() => supabase.auth.signOut()}><Text style={s.signOut}>Sign out</Text></Pressable>
        </View>
        <View style={s.workspace}>
          <View style={s.sidebar}>
            <Pressable style={s.newButton} onPress={newConversation}><Text style={s.newButtonText}>+ New chat</Text></Pressable>
            <Text style={s.sideLabel}>RECENT CHATS</Text>
            <ScrollView>
              {conversations.map(c => (
                <Pressable key={c.id} style={[s.chatLink, conversationId === c.id && s.chatActive]} onPress={() => openConversation(c.id)}>
                  <Text numberOfLines={2} style={s.chatLinkText}>{c.title || "New conversation"}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={s.chatArea}>
            <View style={s.messageList}>
              {messages.length === 0 ? (
                <View style={s.welcome}><Text style={s.welcomeTitle}>What can I help you with?</Text><Text style={s.welcomeSub}>Ask a question to start chatting.</Text></View>
              ) : messages.map((m, i) => (
                <View key={m.id || i} style={[s.message, m.role === "user" ? s.userMessage : s.aiMessage]}>
                  <Text style={s.role}>{m.role === "user" ? "YOU" : "KIDUS AI"}</Text>
                  <Text style={s.messageText}>{m.content}</Text>
                </View>
              ))}
              {busy && <ActivityIndicator color="#a78bfa" style={{ margin: 12 }} />}
            </View>
            {!!notice && <Text style={s.notice}>{notice}</Text>}
            <View style={s.composer}>
              <TextInput style={s.composerInput} placeholder="Message KIDUS AI..." placeholderTextColor="#8b8fa3"
                value={draft} onChangeText={setDraft} multiline />
              <Pressable style={s.sendButton} onPress={sendMessage} disabled={busy || !draft.trim()}>
                <Text style={s.sendText}>↑</Text>
              </Pressable>
            </View>
            <Text style={s.disclaimer}>KIDUS AI can make mistakes. Check important information.</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Centered({ children }) { return <View style={s.center}>{children}</View>; }

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0b1020" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0b1020" },
  authCard: { width: "90%", maxWidth: 420, alignSelf: "center", marginTop: 70, padding: 24, backgroundColor: "#151b2e", borderRadius: 22 },
  logo: { color: "#c4b5fd", fontSize: 30, fontWeight: "900", letterSpacing: 2, textAlign: "center" },
  subtitle: { color: "#a1a1aa", textAlign: "center", marginTop: 5, marginBottom: 32 },
  heading: { color: "white", fontSize: 22, fontWeight: "700", marginBottom: 18 },
  input: { backgroundColor: "#0b1020", borderWidth: 1, borderColor: "#30384f", borderRadius: 12, color: "white", padding: 14, marginBottom: 12 },
  primary: { backgroundColor: "#7c3aed", padding: 15, borderRadius: 12, alignItems: "center", marginTop: 6 },
  primaryText: { color: "white", fontWeight: "700" },
  switch: { color: "#c4b5fd", textAlign: "center", marginTop: 20 },
  notice: { color: "#fbbf24", padding: 8, fontSize: 13 },
  header: { minHeight: 66, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: "#252d42", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logoSmall: { color: "#c4b5fd", fontWeight: "900", fontSize: 20, letterSpacing: 1.5 },
  subtitleSmall: { color: "#8b8fa3", fontSize: 11 },
  signOut: { color: "#c4b5fd", padding: 8 },
  workspace: { flex: 1, flexDirection: "row" },
  sidebar: { width: 190, backgroundColor: "#11182a", padding: 10, borderRightWidth: 1, borderColor: "#252d42" },
  newButton: { borderWidth: 1, borderColor: "#6552a4", borderRadius: 10, padding: 11, marginBottom: 22 },
  newButtonText: { color: "white", fontWeight: "600", textAlign: "center" },
  sideLabel: { color: "#777f98", fontSize: 10, fontWeight: "700", marginBottom: 9, marginLeft: 4 },
  chatLink: { padding: 10, borderRadius: 8, marginBottom: 4 },
  chatActive: { backgroundColor: "#29314a" },
  chatLinkText: { color: "#d4d4dc", fontSize: 12 },
  chatArea: { flex: 1, padding: 12, minWidth: 0 },
  messageList: { flex: 1 },
  welcome: { flex: 1, justifyContent: "center", alignItems: "center" },
  welcomeTitle: { color: "white", fontSize: 22, fontWeight: "700", textAlign: "center" },
  welcomeSub: { color: "#969bb0", marginTop: 8 },
  message: { padding: 13, borderRadius: 14, marginBottom: 10, maxWidth: "94%" },
  userMessage: { backgroundColor: "#34265c", alignSelf: "flex-end" },
  aiMessage: { backgroundColor: "#192238", alignSelf: "flex-start" },
  role: { color: "#b9a8f4", fontSize: 10, fontWeight: "800", marginBottom: 5 },
  messageText: { color: "#f4f4f5", lineHeight: 21 },
  composer: { flexDirection: "row", alignItems: "flex-end", backgroundColor: "#151b2e", borderWidth: 1, borderColor: "#30384f", borderRadius: 14, padding: 7 },
  composerInput: { flex: 1, color: "white", padding: 8, maxHeight: 110, minHeight: 40 },
  sendButton: { backgroundColor: "#7c3aed", borderRadius: 10, width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  sendText: { color: "white", fontSize: 23, fontWeight: "700" },
  disclaimer: { color: "#697189", fontSize: 10, textAlign: "center", marginTop: 7 }
});
