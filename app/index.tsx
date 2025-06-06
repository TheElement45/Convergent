// File: app/index.tsx

import { Text, View, TouchableOpacity, StyleSheet, Image, ScrollView } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import type { LinkProps } from "expo-router";

const Button = ({
  href,
  label,
  style,
}: {
  href: LinkProps["href"];
  label: string;
  style: string;
}) => (
  <Link href={href} asChild>
    <TouchableOpacity
      className={`${style} py-4 rounded-lg mb-4 shadow-md active:opacity-80`}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text className="text-white text-center text-lg font-sans-semibold">{label}</Text>
    </TouchableOpacity>
  </Link>
);

export default function IndexScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1A237E', '#6A1B9A']}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View className="w-full items-center justify-center px-6">
          <Image
            source={require('../assets/images/play_store_512.png')}
            className="w-32 h-32 mb-5"
            resizeMode="contain"
          />

          <Text className="text-5xl text-white font-sans-bold mb-2">
            Convergent
          </Text>
          <Text className="text-center text-white/80 text-lg font-sans-regular mb-12">
            Align Your Actions, Achieve Your Goals
          </Text>

          <View className="w-full max-w-xs">
            <Button href="/(auth)/login" label="Login" style="bg-primary" />
            <Button href="/(auth)/register" label="Register" style="bg-secondary" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  }
});