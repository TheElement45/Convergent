// File: app/index.tsx
import { Text, View, TouchableOpacity } from "react-native";
import { Link } from "expo-router";

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
      className={`${style} py-3 rounded-lg mb-4 shadow-md active:opacity-80`}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text className="text-white text-center text-lg font-sans-semibold">{label}</Text>
    </TouchableOpacity>
  </Link>
);

export default function IndexScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="text-7xl text-primary font-sans-bold mb-4">Convergent</Text>
      <Text className="text-center text-muted text-base font-sans-regular mb-10">
        Welcome! Please log in or create an account to continue.
      </Text>

      <View className="w-full max-w-xs">
        <Button href="/(auth)/login" label="Login" style="bg-primary" />
        <Button href="/(auth)/register" label="Register" style="bg-secondary" />
      </View>
    </View>
  );
}
