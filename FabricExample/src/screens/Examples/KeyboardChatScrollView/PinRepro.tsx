import { useRef, useState } from "react";
import {
  Button,
  LogBox,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from "react-native";
import {
  KeyboardChatScrollView,
  KeyboardController,
  KeyboardProvider,
  KeyboardStickyView,
  type KeyboardChatScrollViewRef,
  useKeyboardHandler,
} from "react-native-keyboard-controller";
import { runOnJS, useSharedValue } from "react-native-reanimated";

LogBox.ignoreAllLogs();

const COMPOSER = 64;
const PAD = 12;
const INITIAL = Array.from({ length: 20 }, (_, i) => `Message ${i + 1}`);

// A message sent with the keyboard up is pinned to the top ("messages to top"):
// `blankSpace` keeps room under it and the list scrolls it there. Then close
// the keyboard: the pinned message should stay where it is.
function PinWhileKeyboardOpen() {
  const ref = useRef<KeyboardChatScrollViewRef>(null);
  const blankSpace = useSharedValue(0);
  const [messages, setMessages] = useState(INITIAL);
  const [text, setText] = useState("");
  const [y, setY] = useState(0);
  const viewport = useRef(0);
  const toPin = useRef<number | null>(null);
  const atEndOnce = useRef(false);
  const [kb, setKb] = useState(0);

  useKeyboardHandler({
    onEnd: (e) => {
      "worklet";

      runOnJS(setKb)(Math.round(e.height));
    },
  });

  const send = () => {
    toPin.current = messages.length;
    setMessages((m) => [...m, `Sent: ${text.trim() || "hello"}`]);
    setText("");
  };

  const onMessageLayout = (index: number) => (e: LayoutChangeEvent) => {
    if (index !== toPin.current) {
      return;
    }

    toPin.current = null;

    const { y: top, height } = e.nativeEvent.layout;

    // room for everything from the sent message down to fill the viewport
    blankSpace.value = Math.max(
      0,
      viewport.current - height - COMPOSER - PAD,
    );
    // after the new inset has reached the scroll view, or the scroll is clamped
    setTimeout(
      () => ref.current?.scrollTo({ y: top - PAD, animated: true }),
      150,
    );
  };

  return (
    <View style={styles.container}>
      <KeyboardChatScrollView
        ref={ref}
        blankSpace={blankSpace}
        contentContainerStyle={styles.content}
        keyboardLiftBehavior="whenAtEnd"
        scrollEventThrottle={16}
        onContentSizeChange={() => {
          if (!atEndOnce.current) {
            atEndOnce.current = true;
            setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 300);
          }
        }}
        onLayout={(e) => {
          viewport.current = e.nativeEvent.layout.height;
        }}
        onScroll={(e) => setY(Math.round(e.nativeEvent.contentOffset.y))}
      >
        {messages.map((m, i) => (
          <Text
            key={m}
            style={[styles.message, m.startsWith("Sent") && styles.sent]}
            onLayout={onMessageLayout(i)}
          >
            {m}
          </Text>
        ))}
      </KeyboardChatScrollView>
      <Text style={styles.offset}>
        y {y} kb {kb}
      </Text>
      <KeyboardStickyView style={styles.composer}>
        <TextInput
          placeholder="Message"
          style={styles.input}
          value={text}
          onChangeText={setText}
        />
        <Button title="Send" onPress={send} />
        <Button title="Hide" onPress={() => KeyboardController.dismiss()} />
      </KeyboardStickyView>
    </View>
  );
}

export default function PinRepro() {
  return (
    <KeyboardProvider>
      <PinWhileKeyboardOpen />
    </KeyboardProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white", paddingTop: 48 },
  content: { padding: PAD, paddingBottom: COMPOSER + PAD, gap: 8 },
  message: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#eee",
    fontSize: 16,
  },
  sent: { backgroundColor: "#0a84ff", color: "white", alignSelf: "flex-end" },
  offset: {
    position: "absolute",
    top: 52,
    right: 12,
    backgroundColor: "black",
    color: "white",
    paddingHorizontal: 6,
    fontVariant: ["tabular-nums"],
  },
  composer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: COMPOSER,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f6f6f6",
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    backgroundColor: "white",
  },
});
