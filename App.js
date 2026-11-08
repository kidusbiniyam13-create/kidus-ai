
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  StyleSheet, StatusBar, KeyboardAvoidingView,
  Platform, ActivityIndicator
} from 'react-native';
import * as Speech from 'expo-speech';

const API_URL =
  'https://kidus-ai-backend.kidusbiniyam13.workers.dev';

const PLANS = [
  { name: 'Starter', price: 50, limit: 30 },
  { name: 'Basic', price: 100, limit: 75 },
  { name: 'Plus', price: 200, limit: 150 },
  { name: 'Pro', price: 250, limit: 300 },
  { name: 'Ultra', price: 500, limit: 600 },
  { name: 'Ultimate', price: 1000, limit: 1500 }
];

export default function App() {
  const [input, setInput] = useState('');
  const [screen, setScreen] = useState('chat');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hey! I'm KIDUS AI. What's on your mind? 😎"
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  async function sendMessage() {
    const message = input.trim();
    if (!message || loading) return;

    const history = messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));

    setMessages(old => [
      ...old,
      { role: 'user', content: message }
    ]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'AI connection failed.');
      }

      setMessages(old => [
        ...old,
        {
          role: 'assistant',
          content: data.reply || 'No response received.'
        }
      ]);
    } catch (error) {
      setMessages(old => [
        ...old,
        {
          role: 'assistant',
          content: 'Connection error: ' + error.message
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function speak(text) {
    Speech.stop();
    Speech.speak(text, { language: 'en-US' });
  }

  function startListening() {
    if (Platform.OS !== 'web') {
      alert('Voice input is available in the web version for now.');
      return;
    }

    const Recognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!Recognition) {
      alert('Please use Chrome or Edge for voice input.');
      return;
    }

    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = event => {
      setInput(event.results[0][0].transcript);
    };
    recognition.onerror = () => {
      setListening(false);
      alert('Voice recognition failed.');
    };

    recognition.start();
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#10101b',
      minHeight: Platform.OS === 'web' ? '100vh' : undefined
    },
    header: {
      padding: 20,
      paddingTop: 35,
      backgroundColor: '#19192a',
      borderBottomWidth: 1,
      borderBottomColor: '#33334b'
    },
    logo: {
      color: 'white',
      fontSize: 25,
      fontWeight: 'bold'
    },
    status: {
      color: '#a78bfa',
      fontSize: 11,
      marginTop: 5
    },
    upgradeButton: {
      backgroundColor: '#7055d8',
      padding: 12,
      borderRadius: 10,
      marginTop: 12,
      alignItems: 'center'
    },
    chat: { flex: 1 },
    chatContent: { padding: 15, flexGrow: 1 },
    message: {
      padding: 14,
      borderRadius: 15,
      marginBottom: 12,
      maxWidth: '88%'
    },
    userMessage: {
      alignSelf: 'flex-end',
      backgroundColor: '#5541a8'
    },
    aiMessage: {
      alignSelf: 'flex-start',
      backgroundColor: '#242438'
    },
    sender: {
      color: '#c4b5fd',
      fontSize: 10,
      fontWeight: 'bold',
      marginBottom: 7
    },
    messageText: {
      color: 'white',
      fontSize: 15,
      lineHeight: 22
    },
    speak: { color: '#c4b5fd', marginTop: 10 },
    loading: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12
    },
    loadingText: { color: '#aaa', marginLeft: 10 },
    inputArea: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: '#19192a',
      gap: 8
    },
    input: {
      flex: 1,
      backgroundColor: '#29293e',
      color: 'white',
      borderRadius: 12,
      padding: 13
    },
    mic: {
      backgroundColor: '#29293e',
      padding: 12,
      borderRadius: 12
    },
    send: {
      backgroundColor: '#7055d8',
      padding: 13,
      borderRadius: 12
    },
    buttonText: { color: 'white', fontSize: 15 },
    heading: {
      color: 'white',
      fontSize: 21,
      fontWeight: 'bold',
      marginVertical: 15
    },
    planOption: {
      backgroundColor: '#242438',
      padding: 17,
      borderRadius: 13,
      marginBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    planCard: {
      backgroundColor: '#292344',
      padding: 20,
      borderRadius: 15,
      marginBottom: 15
    },
    planName: {
      color: 'white',
      fontSize: 17,
      fontWeight: 'bold'
    },
    price: {
      color: '#c4b5fd',
      fontSize: 18,
      fontWeight: 'bold'
    },
    description: {
      color: '#aaa',
      marginTop: 6,
      lineHeight: 21
    },
    notice: {
      backgroundColor: '#45351c',
      padding: 15,
      borderRadius: 12,
      marginTop: 15
    },
    noticeText: { color: '#ffdb9b', lineHeight: 21 },
    backButton: {
      backgroundColor: '#5541a8',
      padding: 15,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 20
    }
  });

  if (screen === 'payment') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <Text style={styles.logo}>KIDUS AI</Text>
          <Text style={styles.status}>PREMIUM SUBSCRIPTION</Text>
        </View>
        <ScrollView contentContainerStyle={styles.chatContent}>
          <Text style={styles.heading}>Your selected plan</Text>
          <View style={styles.planCard}>
            <Text style={styles.planName}>{selectedPlan.name}</Text>
            <Text style={styles.price}>
              {selectedPlan.price.toLocaleString()} ETB / month
            </Text>
            <Text style={styles.description}>
              {selectedPlan.limit} AI messages per day
            </Text>
          </View>
          <Text style={styles.heading}>Payment information</Text>
          <Text style={styles.description}>
            Telebirr payment integration is not connected yet.
            Official payment setup is required before accepting payments.
          </Text>
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Your subscription will only activate after payment verification.
            </Text>
          </View>
          <Pressable style={styles.backButton}
            onPress={() => setScreen('plans')}>
            <Text style={styles.buttonText}>Back to plans</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  if (screen === 'plans') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <Text style={styles.logo}>KIDUS AI</Text>
          <Text style={styles.status}>CHOOSE YOUR PREMIUM PLAN</Text>
        </View>
        <ScrollView contentContainerStyle={styles.chatContent}>
          <Text style={styles.heading}>Upgrade your AI access</Text>
          {PLANS.map(plan => (
            <Pressable key={plan.name} style={styles.planOption}
              onPress={() => {
                setSelectedPlan(plan);
                setScreen('payment');
              }}>
              <View>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.description}>
                  {plan.limit} messages per day
                </Text>
              </View>
              <Text style={styles.price}>
                {plan.price.toLocaleString()} ETB
              </Text>
            </Pressable>
          ))}
          <Pressable style={styles.backButton}
            onPress={() => setScreen('chat')}>
            <Text style={styles.buttonText}>Back to chat</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.logo}>KIDUS AI</Text>
        <Text style={styles.status}>● AI ASSISTANT ONLINE</Text>
        <Pressable style={styles.upgradeButton}
          onPress={() => setScreen('plans')}>
          <Text style={styles.buttonText}>⭐ Upgrade to Premium</Text>
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} style={styles.chat}
        contentContainerStyle={styles.chatContent}>
        {messages.map((item, index) => (
          <View key={index}
            style={[styles.message,
              item.role === 'user' ? styles.userMessage : styles.aiMessage]}>
            <Text style={styles.sender}>
              {item.role === 'user' ? 'YOU' : 'KIDUS AI'}
            </Text>
            <Text style={styles.messageText}>{item.content}</Text>
            {item.role === 'assistant' && (
              <Pressable onPress={() => speak(item.content)}>
                <Text style={styles.speak}>🔊 Speak</Text>
              </Pressable>
            )}
          </View>
        ))}
        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator color="#a78bfa" />
            <Text style={styles.loadingText}>KIDUS AI is thinking...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputArea}>
        <Pressable style={styles.mic} onPress={startListening}>
          <Text style={styles.buttonText}>{listening ? '🔴' : '🎤'}</Text>
        </Pressable>
        <TextInput style={styles.input} value={input}
          onChangeText={setInput}
          placeholder="Ask KIDUS AI anything..."
          placeholderTextColor="#888"
          onSubmitEditing={sendMessage} />
        <Pressable style={styles.send} onPress={sendMessage}
          disabled={loading}>
          <Text style={styles.buttonText}>➤</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
