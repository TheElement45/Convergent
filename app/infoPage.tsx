// File: app/infoPage.tsx

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

export default function InfoPage() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const title = params.title || 'Information';
  const content = params.content || 'No content provided.';

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <FontAwesome5 name="times" size={24} color="#4A5568" />
        </TouchableOpacity>
      </View>


      <ScrollView contentContainerStyle={styles.contentContainer}>
        {String(content).split('\\n').map((paragraph, index) => (
          <Text key={index} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A202C',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    padding: 8,
  },
  contentContainer: {
    padding: 24,
  },
  paragraph: {
    fontSize: 16,
    color: '#4A5568',
    lineHeight: 24,
    marginBottom: 16,
  },
});