// src/LevelSelectScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { levels } from './levels';

export default function LevelSelectScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Level</Text>
      <FlatList
        data={levels}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.levelButton}
            onPress={() => navigation.navigate('CandyGameScreen', { level: item.id })}
          >
            <Text style={styles.levelText}>Level {item.id}</Text>
            <Text style={styles.levelDetails}>🎯 Target: {item.targetScore} | ⏱ Time: {item.duration}s</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f2f2f2',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  levelButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  levelText: {
    fontSize: 20,
    fontWeight: '600',
  },
  levelDetails: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
});
