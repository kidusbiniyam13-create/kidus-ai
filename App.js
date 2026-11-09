
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL =
  'https://kidus-ai-backend.kidusbiniyam13.workers.dev';

const CHAT_KEY = 'kidus_ai_chats_v1';
const THEME_KEY = 'kidus_ai_theme_v1';
const UPDATE_KEY = 'kidus_ai_auto_updates_v1';

const makeId = () =>
  Date.now().toString() + Math.random().toString(36).slice(2, 7);

const makeChat = () => ({
  id: makeId(),
  title: 'New conversation',
  messages: [],
  updatedAt: Date.now(),
});

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [autoUpdates, setAutoUpdates] = useState(true);

  const [screen, setScreen] = useState('Chat');
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // Image generator state
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState('');

  const theme = darkMode ? colors.dark : colors.light;

  // Load saved app data
  useEffect(() => {
    async function loadApp() {
      try {
        const savedChats = await AsyncStorage.getItem(CHAT_KEY);
        const savedTheme = await AsyncStorage.getItem(THEME_KEY);
        const savedUpdates = await AsyncStorage.getItem(UPDATE_KEY);

        let loadedChats = savedChats
          ? JSON.parse(savedChats)
          : [];

        if (!Array.isArray(loadedChats)) {
          loadedChats = [];
        }

        if (savedTheme !== null) {
          setDarkMode(savedTheme === 'dark');
        }

        if (savedUpdates !== null) {
          setAutoUpdates(savedUpdates === 'true');
        }

        if (loadedChats.length === 0) {
          loadedChats = [makeChat()];
        }

        setChats(loadedChats);
        setCurrentChatId(loadedChats[0].id);
        setMessages(loadedChats[0].messages || []);
      } catch (error) {
        const firstChat = makeChat();
        setChats([firstChat]);
        setCurrentChatId(firstChat.id);
        setMessages([]);
      } finally {
        setReady(true);
      }
    }

    loadApp();
  }, []);

  // Save conversations
  useEffect(() => {
    if (!ready || !currentChatId) return;

    const updatedChats = chats.map(chat =>
      chat.id === currentChatId
        ? {
            ...chat,
            messages,
            updatedAt: Date.now(),
            title:
              chat.title === 'New conversation' && messages.length > 0
                ? messages[0].content.slice(0, 32)
                : chat.title,
          }
        : chat
    );

    setChats(updatedChats);

    AsyncStorage.setItem(
      CHAT_KEY,
      JSON.stringify(updatedChats)
    ).catch(() => {});
  }, [messages, currentChatId, ready]);

  // Save settings
  useEffect(() => {
    if (ready) {
      AsyncStorage.setItem(
        THEME_KEY,
        darkMode ? 'dark' : 'light'
      ).catch(() => {});
    }
  }, [darkMode, ready]);

  useEffect(() => {
    if (ready) {
      AsyncStorage.setItem(
        UPDATE_KEY,
        String(autoUpdates)
      ).catch(() => {});
    }
  }, [autoUpdates, ready]);

  function startNewChat() {
    const newChat = makeChat();

    setChats(previous => [newChat, ...previous]);
    setCurrentChatId(newChat.id);
    setMessages([]);
    setInput('');
    setScreen('Chat');
  }

  function openChat(chat) {
    setCurrentChatId(chat.id);
    setMessages(chat.messages || []);
    setInput('');
    setScreen('Chat');
  }

  function deleteChat(chatId) {
    Alert.alert(
      'Delete conversation',
      'Are you sure you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            let remaining = chats.filter(
              chat => chat.id !== chatId
            );

            if (remaining.length === 0) {
              const freshChat = makeChat();
              remaining = [freshChat];
            }

            setChats(remaining);

            if (currentChatId === chatId) {
              setCurrentChatId(remaining[0].id);
              setMessages(remaining[0].messages || []);
            }

            await AsyncStorage.setItem(
              CHAT_KEY,
              JSON.stringify(remaining)
            ).catch(() => {});
          },
        },
      ]
    );
  }

  // Normal AI chat
  async function sendMessage() {
    const question = input.trim();

    if (!question || loading) return;

    const userMessage = {
      role: 'user',
      content: question,
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: question,
          history: updatedMessages.slice(-12).map(item => ({
            role: item.role,
            content: item.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server error');
      }

      if (!data.reply) {
        throw new Error('Empty AI response');
      }

      setMessages(previous => [
        ...previous,
        {
          role: 'assistant',
          content: data.reply,
        },
      ]);
    } catch (error) {
      setMessages(previous => [
        ...previous,
        {
          role: 'assistant',
          content:
            'I could not connect to KIDUS AI. Please check your internet connection and try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // IMAGE GENERATOR
  async function generateImage() {
    const prompt = imagePrompt.trim();

    if (!prompt || imageLoading) return;

    setImageLoading(true);
    setImageError('');
    setGeneratedImage(null);

    try {
      const response = await fetch(
        API_URL + '/generate-image',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Image generation failed.'
        );
      }

      if (!data.image) {
        throw new Error('The server did not return an image.');
      }

      setGeneratedImage(data.image);
    } catch (error) {
      setImageError(
        error.message ||
        'Could not generate the image. Please try again.'
      );
    } finally {
      setImageLoading(false);
    }
  }

  function renderHeader() {
    return (
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => setScreen('Chat')}
          style={styles.brandArea}
        >
          <View style={styles.logo}>
            <Text style={styles.logoText}>K</Text>
          </View>

          <View>
            <Text style={[styles.brand, { color: theme.text }]}>
              KIDUS AI
            </Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>
              Your AI assistant
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.newButton, { backgroundColor: theme.card }]}
          onPress={startNewChat}
        >
          <Text style={{ color: theme.text, fontSize: 20 }}>＋</Text>
          <Text style={[styles.newButtonText, { color: theme.text }]}>
            New
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderChat() {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.messagesArea}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && (
            <View style={styles.welcome}>
              <View style={styles.bigLogo}>
                <Text style={styles.bigLogoText}>K</Text>
              </View>

              <Text style={[styles.welcomeTitle, { color: theme.text }]}>
                Welcome to KIDUS AI
              </Text>

              <Text style={[styles.welcomeText, { color: theme.muted }]}>
                Ask me anything. I'm ready to help.
              </Text>

              <TouchableOpacity
                style={styles.createShortcut}
                onPress={() => setScreen('Create')}
              >
                <Text style={styles.createShortcutText}>
                  ✨ Create images and videos
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {messages.map((message, index) => {
            const isUser = message.role === 'user';

            return (
              <View
                key={index}
                style={[
                  styles.messageRow,
                  isUser ? styles.userRow : styles.aiRow,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    {
                      backgroundColor: isUser
                        ? theme.userBubble
                        : theme.card,
                    },
                  ]}
                >
                  <Text style={[styles.messageText, { color: theme.text }]}>
                    {message.content}
                  </Text>
                </View>
              </View>
            );
          })}

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#8B7CFF" />
              <Text style={[styles.loadingText, { color: theme.muted }]}>
                KIDUS AI is thinking...
              </Text>
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.inputArea,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.border,
            },
          ]}
        >
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            value={input}
            onChangeText={setInput}
            placeholder="Message KIDUS AI..."
            placeholderTextColor={theme.muted}
            multiline
            maxLength={4000}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              { opacity: input.trim() && !loading ? 1 : 0.5 },
            ]}
            onPress={sendMessage}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendButtonText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // CREATE TAB
  function renderCreate() {
    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.pageContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.pageTitle, { color: theme.text }]}>
          Create
        </Text>

        <Text style={[styles.pageDescription, { color: theme.muted }]}>
          Turn your ideas into images and videos.
        </Text>

        <View style={[styles.generatorCard, { backgroundColor: theme.card }]}>
          <View style={styles.generatorHeading}>
            <View style={styles.generatorIcon}>
              <Text style={{ fontSize: 24 }}>🖼️</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.generatorTitle, { color: theme.text }]}>
                Image Generator
              </Text>
              <Text style={[styles.generatorSubtitle, { color: theme.muted }]}>
                Create images from your imagination
              </Text>
            </View>

            <Text style={styles.availableLabel}>READY</Text>
          </View>

          <Text style={[styles.promptLabel, { color: theme.text }]}>
            Describe your image
          </Text>

          <TextInput
            style={[
              styles.promptInput,
              {
                color: theme.text,
                backgroundColor: theme.background,
                borderColor: theme.border,
              },
            ]}
            value={imagePrompt}
            onChangeText={setImagePrompt}
            placeholder="Example: A futuristic gaming room with purple neon lights..."
            placeholderTextColor={theme.muted}
            multiline
            maxLength={1500}
          />

          <TouchableOpacity
            style={[
              styles.generateButton,
              {
                opacity:
                  imagePrompt.trim() && !imageLoading ? 1 : 0.5,
              },
            ]}
            onPress={generateImage}
            disabled={!imagePrompt.trim() || imageLoading}
          >
            {imageLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.generateButtonText}>
                ✨ Generate Image
              </Text>
            )}
          </TouchableOpacity>

          {imageError !== '' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{imageError}</Text>
            </View>
          )}

          {generatedImage && (
            <View style={styles.resultContainer}>
              <Text style={[styles.resultTitle, { color: theme.text }]}>
                Your generated image
              </Text>

              <Image
                source={{ uri: generatedImage }}
                style={styles.generatedImage}
                resizeMode="contain"
              />

              <Text style={[styles.resultNote, { color: theme.muted }]}>
                Generated by KIDUS AI
              </Text>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setGeneratedImage(null);
                  setImageError('');
                }}
              >
                <Text style={styles.secondaryButtonText}>
                  Create another image
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[styles.generatorCard, { backgroundColor: theme.card }]}>
          <View style={styles.generatorHeading}>
            <View style={styles.generatorIcon}>
              <Text style={{ fontSize: 24 }}>🎬</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.generatorTitle, { color: theme.text }]}>
                Video Generator
              </Text>
              <Text style={[styles.generatorSubtitle, { color: theme.muted }]}>
                Turn text descriptions into videos
              </Text>
            </View>

            <Text style={styles.comingSoonLabel}>SOON</Text>
          </View>

          <View style={styles.videoPreview}>
            <Text style={{ fontSize: 42 }}>▶</Text>
            <Text style={styles.videoPreviewText}>
              AI video creation
            </Text>
          </View>

          <Text style={[styles.videoDescription, { color: theme.muted }]}>
            Video generation is being prepared. We still need to connect
            a video-generation provider before this feature can create
            real videos.
          </Text>

          <View style={styles.disabledButton}>
            <Text style={styles.disabledButtonText}>
              Video Generator — Coming Soon
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  function renderHistory() {
    return (
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Text style={[styles.pageTitle, { color: theme.text }]}>
          Chat history
        </Text>

        <Text style={[styles.pageDescription, { color: theme.muted }]}>
          Your saved conversations appear here.
        </Text>

        <TouchableOpacity
          style={styles.generateButton}
          onPress={startNewChat}
        >
          <Text style={styles.generateButtonText}>
            ＋ Start a new chat
          </Text>
        </TouchableOpacity>

        {chats
          .slice()
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map(chat => (
            <View
              key={chat.id}
              style={[styles.historyItem, { backgroundColor: theme.card }]}
            >
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => openChat(chat)}
              >
                <Text style={[styles.historyTitle, { color: theme.text }]}>
                  {chat.title}
                </Text>

                <Text style={{ color: theme.muted, marginTop: 5 }}>
                  {(chat.messages || []).length} messages
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => deleteChat(chat.id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))}
      </ScrollView>
    );
  }

  function renderDevices() {
    return (
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Text style={[styles.pageTitle, { color: theme.text }]}>
          Devices
        </Text>

        <Text style={[styles.pageDescription, { color: theme.muted }]}>
          Manage device preferences and app settings.
        </Text>

        <View style={[styles.settingCard, { backgroundColor: theme.card }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>
              Automatic updates
            </Text>

            <Text style={[styles.settingDescription, { color: theme.muted }]}>
              Save your preference for automatic updates.
            </Text>
          </View>

          <Switch
            value={autoUpdates}
            onValueChange={setAutoUpdates}
            trackColor={{ false: '#555', true: '#7968F5' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.settingTitle, { color: theme.text }]}>
            Update information
          </Text>

          <Text style={[styles.settingDescription, { color: theme.muted }]}>
            Automatic installation needs Expo EAS Update and a compatible
            app build. This setting currently saves your preference.
          </Text>
        </View>
      </ScrollView>
    );
  }

  function renderCredits() {
    const credits = [
      ['Kidus Biniam', 'Founder, creator and developer of KIDUS AI.'],
      ['OpenAI & ChatGPT', 'AI technology, guidance and development assistance.'],
      ['God', 'Strength, inspiration and opportunity.'],
      ['My PC', 'The machine that made the project possible.'],
    ];

    return (
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Text style={[styles.pageTitle, { color: theme.text }]}>
          Credits
        </Text>

        {credits.map((credit, index) => (
          <View
            key={index}
            style={[styles.creditCard, { backgroundColor: theme.card }]}
          >
            <Text style={styles.creditNumber}>0{index + 1}</Text>

            <View style={{ flex: 1 }}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>
                {credit[0]}
              </Text>
              <Text style={[styles.settingDescription, { color: theme.muted }]}>
                {credit[1]}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  }

  function renderSettings() {
    return (
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Text style={[styles.pageTitle, { color: theme.text }]}>
          Settings
        </Text>

        <View style={[styles.settingCard, { backgroundColor: theme.card }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>
              Dark mode
            </Text>
            <Text style={[styles.settingDescription, { color: theme.muted }]}>
              Change the appearance of the app.
            </Text>
          </View>

          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#555', true: '#7968F5' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <TouchableOpacity
          style={[styles.settingCard, { backgroundColor: theme.card }]}
          onPress={() => setScreen('Devices')}
        >
          <Text style={[styles.settingTitle, { color: theme.text }]}>
            Devices
          </Text>
          <Text style={{ color: theme.muted, fontSize: 22 }}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingCard, { backgroundColor: theme.card }]}
          onPress={() => setScreen('Credits')}
        >
          <Text style={[styles.settingTitle, { color: theme.text }]}>
            About and credits
          </Text>
          <Text style={{ color: theme.muted, fontSize: 22 }}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  function renderFooter() {
    const tabs = [
      { name: 'Chat', icon: '✦' },
      { name: 'Create', icon: '＋' },
      { name: 'History', icon: '◷' },
      { name: 'Devices', icon: '▣' },
      { name: 'Settings', icon: '⚙' },
    ];

    return (
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
          },
        ]}
      >
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.name}
            style={styles.footerTab}
            onPress={() => setScreen(tab.name)}
          >
            <Text
              style={[
                styles.footerIcon,
                {
                  color:
                    screen === tab.name ? '#8B7CFF' : theme.muted,
                },
              ]}
            >
              {tab.icon}
            </Text>

            <Text
              style={[
                styles.footerLabel,
                {
                  color:
                    screen === tab.name ? '#8B7CFF' : theme.muted,
                },
              ]}
            >
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#8B7CFF" />
        <Text style={{ color: theme.text, marginTop: 12 }}>
          Loading KIDUS AI...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {renderHeader()}

      {screen === 'Chat' && renderChat()}
      {screen === 'Create' && renderCreate()}
      {screen === 'History' && renderHistory()}
      {screen === 'Devices' && renderDevices()}
      {screen === 'Settings' && renderSettings()}
      {screen === 'Credits' && renderCredits()}

      {renderFooter()}
    </SafeAreaView>
  );
}

const colors = {
  dark: {
    background: '#10111A',
    card: '#1C1E2B',
    text: '#F5F5FA',
    muted: '#9698AA',
    border: '#292B3A',
    userBubble: '#5145B8',
  },
  light: {
    background: '#F7F7FC',
    card: '#FFFFFF',
    text: '#171827',
    muted: '#77798B',
    border: '#E5E5EF',
    userBubble: '#DCD7FF',
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 72,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  brandArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#7968F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
  },
  brand: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  newButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  messagesArea: {
    flex: 1,
  },
  messagesContent: {
    padding: 17,
    paddingBottom: 30,
    flexGrow: 1,
  },
  welcome: {
    flex: 1,
    minHeight: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigLogo: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: '#7968F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  bigLogoText: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
  },
  welcomeTitle: {
    fontSize: 23,
    fontWeight: '800',
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 14,
    marginTop: 9,
    textAlign: 'center',
  },
  createShortcut: {
    backgroundColor: '#7968F5',
    padding: 13,
    paddingHorizontal: 18,
    borderRadius: 13,
    marginTop: 24,
  },
  createShortcutText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  messageRow: {
    width: '100%',
    marginVertical: 7,
    flexDirection: 'row',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '88%',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 17,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 23,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 9,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingTop: 13,
    paddingBottom: 11,
    fontSize: 15,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#7968F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
  },
  footer: {
    height: 65,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  footerTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  footerIcon: {
    fontSize: 20,
  },
  footerLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  pageContent: {
    padding: 20,
    paddingBottom: 35,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 7,
  },
  pageDescription: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 22,
  },
  generatorCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 17,
  },
  generatorHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 20,
  },
  generatorIcon: {
    width: 47,
    height: 47,
    borderRadius: 14,
    backgroundColor: '#302B55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generatorTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  generatorSubtitle: {
    fontSize: 11,
    marginTop: 4,
  },
  availableLabel: {
    color: '#4CD6A0',
    fontSize: 10,
    fontWeight: '900',
  },
  comingSoonLabel: {
    color: '#F0B95B',
    fontSize: 10,
    fontWeight: '900',
  },
  promptLabel: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 9,
  },
  promptInput: {
    minHeight: 105,
    borderWidth: 1,
    borderRadius: 13,
    padding: 13,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 13,
  },
  generateButton: {
    backgroundColor: '#7968F5',
    padding: 15,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  errorBox: {
    backgroundColor: '#49252D',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  errorText: {
    color: '#FFB8C0',
    fontSize: 13,
  },
  resultContainer: {
    marginTop: 20,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },
  generatedImage: {
    width: '100%',
    height: 320,
    backgroundColor: '#292B3A',
    borderRadius: 14,
  },
  resultNote: {
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#7968F5',
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
    marginTop: 13,
  },
  secondaryButtonText: {
    color: '#A99FFF',
    fontWeight: '800',
  },
  videoPreview: {
    height: 145,
    backgroundColor: '#11121D',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  videoPreviewText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  videoDescription: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 13,
    marginBottom: 13,
  },
  disabledButton: {
    backgroundColor: '#39364F',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButtonText: {
    color: '#BDB5E8',
    fontSize: 13,
    fontWeight: '800',
  },
  historyItem: {
    borderRadius: 14,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  deleteText: {
    color: '#FF6B75',
    fontSize: 12,
    fontWeight: '700',
    padding: 7,
  },
  settingCard: {
    padding: 17,
    borderRadius: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  settingDescription: {
    fontSize: 13,
    lineHeight: 20,
  },
  infoCard: {
    padding: 17,
    borderRadius: 15,
    marginBottom: 12,
  },
  creditCard: {
    padding: 17,
    borderRadius: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  creditNumber: {
    color: '#8B7CFF',
    fontSize: 21,
    fontWeight: '900',
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
