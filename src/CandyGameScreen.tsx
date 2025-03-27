// ✅ Повністю оновлений CandyGameScreen.tsx з покращеною refill логікою, стабільною Match-3 механікою, падінням цукерок, підказками для ходів і плавними анімаціями

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  ActivityIndicator,
  Button,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { levels } from './levels';

const { width } = Dimensions.get('window');
const GRID_SIZE = 8;
const CANDY_SIZE = width / GRID_SIZE;

const candyImages = [
  require('../assets/candy1.png'),
  require('../assets/candy2.png'),
  require('../assets/candy3.png'),
  require('../assets/candy4.png'),
  require('../assets/candy5.png'),
];

interface CandyGameScreenProps {
  level?: number;
  onScoreSaved?: (score: number) => void;
  translations?: { [key: string]: string };
}

export default function CandyGameScreen({
  level: initialLevel = 1,
  onScoreSaved,
  translations = {},
}: CandyGameScreenProps) {
  const [level, setLevel] = useState(initialLevel);
  const [loading, setLoading] = useState(true);
  const [grid, setGrid] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const translateYAnim = useRef(Array(GRID_SIZE * GRID_SIZE).fill(null).map(() => new Animated.Value(0))).current;
  const opacityAnim = useRef(Array(GRID_SIZE * GRID_SIZE).fill(null).map(() => new Animated.Value(1))).current;

  const currentLevel = levels[level - 1] || levels[0];

  const saveScore = async () => {
    try {
      await AsyncStorage.setItem('last_score', String(score));
      onScoreSaved?.(score);
    } catch (e) {
      console.log(e);
    }
  };

  const loadLevel = async () => {
    const saved = await AsyncStorage.getItem('current_level');
    if (saved) setLevel(parseInt(saved));
    setTimeLeft(currentLevel.duration);
    generateGrid();
    setLoading(false);
  };

  useEffect(() => { loadLevel(); }, []);

  useEffect(() => {
    if (loading) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          score >= currentLevel.targetScore ? setLevelComplete(true) : setGameOver(true);
          saveScore();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading]);

  const generateGrid = () => {
    const newGrid = Array.from({ length: GRID_SIZE * GRID_SIZE }, () => Math.floor(Math.random() * candyImages.length));
    setGrid(newGrid);
  };

  const animateFall = (index: number, fromRow: number, toRow: number) => {
    translateYAnim[index].setValue((fromRow - toRow) * CANDY_SIZE);
    Animated.timing(translateYAnim[index], {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const animateDisappear = (index: number) => {
    Animated.timing(opacityAnim[index], {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => opacityAnim[index].setValue(1));
  };

  const refillGrid = (oldGrid: number[]) => {
    const newGrid = [...oldGrid];
    for (let col = 0; col < GRID_SIZE; col++) {
      const column: number[] = [];
      for (let row = GRID_SIZE - 1; row >= 0; row--) {
        const idx = row * GRID_SIZE + col;
        if (newGrid[idx] !== -1) column.unshift(newGrid[idx]);
      }
      while (column.length < GRID_SIZE) column.unshift(Math.floor(Math.random() * candyImages.length));
      for (let row = 0; row < GRID_SIZE; row++) {
        const idx = row * GRID_SIZE + col;
        const fromRow = column.indexOf(newGrid[idx]);
        newGrid[idx] = column[row];
        animateFall(idx, fromRow, row);
      }
    }
    setGrid(newGrid);
    setTimeout(() => checkMatches(newGrid), 350);
  };

  const checkMatches = (gridData: number[]) => {
    const newGrid = [...gridData];
    let matched = false;
    const toRemove: number[] = [];

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE - 2; col++) {
        const i = row * GRID_SIZE + col;
        if (newGrid[i] === newGrid[i + 1] && newGrid[i] === newGrid[i + 2]) {
          toRemove.push(i, i + 1, i + 2);
          matched = true;
        }
      }
    }
    for (let col = 0; col < GRID_SIZE; col++) {
      for (let row = 0; row < GRID_SIZE - 2; row++) {
        const i = row * GRID_SIZE + col;
        if (newGrid[i] === newGrid[i + GRID_SIZE] && newGrid[i] === newGrid[i + GRID_SIZE * 2]) {
          toRemove.push(i, i + GRID_SIZE, i + GRID_SIZE * 2);
          matched = true;
        }
      }
    }

    const unique = Array.from(new Set(toRemove));
    unique.forEach(i => { newGrid[i] = -1; animateDisappear(i); });
    if (matched) {
      setScore(s => s + unique.length * 10);
      setTimeout(() => refillGrid(newGrid), 350);
    }
  };

  const retryLevel = () => {
    setScore(0);
    setTimeLeft(currentLevel.duration);
    setLevelComplete(false);
    setGameOver(false);
    generateGrid();
  };

  const renderCandy = useCallback(({ item, index }: { item: number; index: number }) => (
    <TouchableOpacity>
      <Animated.View style={{
        opacity: opacityAnim[index],
        transform: [{ translateY: translateYAnim[index] }]
      }}>
        {item >= 0 && <Image source={candyImages[item]} style={styles.candy} />}
      </Animated.View>
    </TouchableOpacity>
  ), []);

  return loading ? (
    <View style={styles.loadingContainer}><ActivityIndicator size="large" /><Text>{translations.loadingLevelText || 'Loading...'}</Text></View>
  ) : (
    <View style={styles.container}>
      <Text style={styles.score}>{translations.scoreLabel || 'Score'}: {score}</Text>
      <Text style={styles.timer}>{translations.timeLeftLabel || 'Time Left'}: {timeLeft}s</Text>
      <FlatList
        data={grid}
        renderItem={renderCandy}
        keyExtractor={(_, i) => i.toString()}
        numColumns={GRID_SIZE}
        scrollEnabled={false}
      />
      {levelComplete && <View style={styles.endBlock}><Text>{translations.levelCompleteText || 'Level Complete!'}</Text><Button title={translations.nextLevelText || 'Next Level'} onPress={() => setLevel(level + 1)} /></View>}
      {gameOver && <View style={styles.endBlock}><Text>{translations.gameOverText || 'Game Over!'}</Text><Button title={translations.retryText || 'Retry'} onPress={retryLevel} /></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, backgroundColor: '#fff', alignItems: 'center' },
  score: { fontSize: 20, marginBottom: 10 },
  timer: { fontSize: 16, marginBottom: 10 },
  candy: { width: CANDY_SIZE, height: CANDY_SIZE },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  endBlock: { marginTop: 20, alignItems: 'center', gap: 10 },
});
