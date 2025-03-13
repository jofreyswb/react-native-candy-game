import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './navigationTypes';
import { levels } from './levels';

const LevelSelectScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default LevelSelectScreen;

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, marginBottom: 20 },
  levelButton: {
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f3c200',
    borderRadius: 10,
  },
  levelText: {
    fontSize: 18,
    color: '#000',
  },
});
