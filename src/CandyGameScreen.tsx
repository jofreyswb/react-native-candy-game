// src/CandyGameScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  Button,
  ActivityIndicator,
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
  require('../assets/bonus_row.png'),
  require('../assets/bonus_col.png'),
];

const BONUS_ROW_INDEX = candyImages.length - 2;
const BONUS_COL_INDEX = candyImages.length - 1;

interface CandyGameScreenProps {
  level?: number;
  onScoreSaved?: (score: number) => void;
  translations?: {
    scoreLabel?: string;
    timeLeftLabel?: string;
    finalScoreLabel?: string;
    gameOverText?: string;
    levelCompleteText?: string;
    nextLevelText?: string;
    retryText?: string;
    loadingLevelText?: string;
  };
}

export default function CandyGameScreen({
  level: initialLevel = 1,
  onScoreSaved,
  translations = {},
}: CandyGameScreenProps) {
  const [level, setLevel] = useState<number>(initialLevel);
  const [loading, setLoading] = useState<boolean>(true);
  const currentLevel = levels.find((l) => l.id === level) || levels[0];
  const [grid, setGrid] = useState<number[]>([]);
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(currentLevel.duration);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [levelComplete, setLevelComplete] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const scaleAnim = useRef(Array(GRID_SIZE * GRID_SIZE).fill(0).map(() => new Animated.Value(1))).current;
  const opacityAnim = useRef(Array(GRID_SIZE * GRID_SIZE).fill(0).map(() => new Animated.Value(1))).current;

  const generateGrid = () => {
    const newGrid = Array.from({ length: GRID_SIZE * GRID_SIZE }, () => {
      const bonusChance = Math.random();
      if (bonusChance < 0.03) return BONUS_ROW_INDEX;
      if (bonusChance < 0.06) return BONUS_COL_INDEX;
      return Math.floor(Math.random() * currentLevel.candyTypes);
    });
    setGrid(newGrid);
  };

  const saveScore = async () => {
    try {
      await AsyncStorage.setItem('last_score', String(score));
      onScoreSaved?.(score);
    } catch (e) {
      console.error('Failed to save score', e);
    }
  };

  const loadLevel = async () => {
    try {
      const savedLevel = await AsyncStorage.getItem('current_level');
      if (savedLevel) {
        setLevel(parseInt(savedLevel, 10));
      }
    } catch (e) {
      console.error('Failed to load level', e);
    }
    setTimeout(() => setLoading(false), 800); // mini splash delay
  };

  const saveLevel = async (newLevel: number) => {
    try {
      await AsyncStorage.setItem('current_level', String(newLevel));
    } catch (e) {
      console.error('Failed to save level', e);
    }
  };

  useEffect(() => {
    loadLevel();
  }, []);

  useEffect(() => {
    if (loading) return;
    generateGrid();
    const interval = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (score >= currentLevel.targetScore) {
            setLevelComplete(true);
            saveLevel(level + 1);
          } else {
            setGameOver(true);
          }
          saveScore();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [level, loading]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>{translations.loadingLevelText || 'Loading your level…'}</Text>
      </View>
    );
  }
  const goToNextLevel = () => {
    const nextLevel = level + 1;
    setLevel(nextLevel);
    saveLevel(nextLevel);
    setScore(0);
    setTimeLeft((levels[nextLevel]?.duration || 60));
    setLevelComplete(false);
    setGameOver(false);
    setSelectedIndex(null);
    generateGrid();
  };

  const retryLevel = () => {
    setScore(0);
    setTimeLeft(currentLevel.duration);
    setLevelComplete(false);
    setGameOver(false);
    setSelectedIndex(null);
    generateGrid();
  };

  const swapCandies = (index1: number, index2: number) => {
    const newGrid = [...grid];
    [newGrid[index1], newGrid[index2]] = [newGrid[index2], newGrid[index1]];
    setGrid(newGrid);
    checkMatches(newGrid);
  };

  const isAdjacent = (i1: number, i2: number) => {
    const row1 = Math.floor(i1 / GRID_SIZE);
    const col1 = i1 % GRID_SIZE;
    const row2 = Math.floor(i2 / GRID_SIZE);
    const col2 = i2 % GRID_SIZE;
    return (
      (Math.abs(row1 - row2) === 1 && col1 === col2) ||
      (Math.abs(col1 - col2) === 1 && row1 === row2)
    );
  };

  const handleCandyPress = (index: number) => {
    const value = grid[index];
    if (value === BONUS_ROW_INDEX) {
      clearRow(index);
      return;
    }
    if (value === BONUS_COL_INDEX) {
      clearColumn(index);
      return;
    }
    if (selectedIndex === null) {
      setSelectedIndex(index);
      animatePress(index);
    } else {
      if (isAdjacent(selectedIndex, index)) {
        swapCandies(selectedIndex, index);
      }
      setSelectedIndex(null);
    }
  };

  const animatePress = (index: number) => {
    Animated.sequence([
      Animated.timing(scaleAnim[index], {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateDisappear = (index: number) => {
    Animated.timing(opacityAnim[index], {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      opacityAnim[index].setValue(1);
    });
  };

  const clearRow = (index: number) => {
    const rowStart = Math.floor(index / GRID_SIZE) * GRID_SIZE;
    const newGrid = [...grid];
    for (let i = 0; i < GRID_SIZE; i++) {
      const idx = rowStart + i;
      newGrid[idx] = -1;
      animateDisappear(idx);
    }
    setGrid(newGrid);
    setScore((prev: number) => prev + 100);
    setTimeout(() => refillGrid(newGrid), 400);
  };

  const clearColumn = (index: number) => {
    const col = index % GRID_SIZE;
    const newGrid = [...grid];
    for (let i = 0; i < GRID_SIZE; i++) {
      const idx = i * GRID_SIZE + col;
      newGrid[idx] = -1;
      animateDisappear(idx);
    }
    setGrid(newGrid);
    setScore((prev: number) => prev + 100);
    setTimeout(() => refillGrid(newGrid), 400);
  };

  const checkMatches = (gridData: number[]) => {
    const newGrid = [...gridData];
    let matchFound = false;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE - 2; col++) {
        const i = row * GRID_SIZE + col;
        if (newGrid[i] === newGrid[i + 1] && newGrid[i] === newGrid[i + 2] && newGrid[i] !== -1) {
          matchFound = true;
          newGrid[i] = newGrid[i + 1] = newGrid[i + 2] = -1;
          animateDisappear(i);
          animateDisappear(i + 1);
          animateDisappear(i + 2);
          setScore((prev: number) => prev + 30);
        }
      }
    }
    for (let col = 0; col < GRID_SIZE; col++) {
      for (let row = 0; row < GRID_SIZE - 2; row++) {
        const i = row * GRID_SIZE + col;
        if (newGrid[i] === newGrid[i + GRID_SIZE] && newGrid[i] === newGrid[i + GRID_SIZE * 2] && newGrid[i] !== -1) {
          matchFound = true;
          newGrid[i] = newGrid[i + GRID_SIZE] = newGrid[i + GRID_SIZE * 2] = -1;
          animateDisappear(i);
          animateDisappear(i + GRID_SIZE);
          animateDisappear(i + GRID_SIZE * 2);
          setScore((prev: number) => prev + 30);
        }
      }
    }
    if (matchFound) {
      setGrid(newGrid);
      setTimeout(() => refillGrid(newGrid), 400);
    }
  };

  const refillGrid = (gridData: number[]) => {
    const newGrid = [...gridData];
    for (let i = newGrid.length - 1; i >= 0; i--) {
      if (newGrid[i] === -1) {
        for (let j = i; j >= 0; j -= GRID_SIZE) {
          if (j - GRID_SIZE >= 0) {
            newGrid[j] = newGrid[j - GRID_SIZE];
          } else {
            newGrid[j] = Math.floor(Math.random() * currentLevel.candyTypes);
          }
        }
      }
    }
    setGrid(newGrid);
  };

  const renderCandy = useCallback(({ item, index }: { item: number; index: number }) => {
    const highlight = selectedIndex === index;
    return (
      <TouchableOpacity onPress={() => handleCandyPress(index)}>
        <Animated.View style={[{ transform: [{ scale: scaleAnim[index] }], opacity: opacityAnim[index] }, highlight && styles.selected]}>
          {item >= 0 && <Image source={candyImages[item]} style={styles.candy} />}
        </Animated.View>
      </TouchableOpacity>
    );
  }, [selectedIndex]);

  return (
    <View style={styles.container}>
      <Text style={styles.score}>{translations.scoreLabel || 'Score'}: {score}</Text>
      <Text style={styles.timer}>{translations.timeLeftLabel || 'Time Left'}: {timeLeft}s</Text>
      <FlatList
        data={grid}
        renderItem={renderCandy}
        keyExtractor={(_, index) => index.toString()}
        numColumns={GRID_SIZE}
        scrollEnabled={false}
      />
      {levelComplete && (
        <View style={styles.endBlock}>
          <Text style={styles.gameOver}>{translations.levelCompleteText || 'Level Complete!'}
            {'\n'}{translations.finalScoreLabel || 'Final Score'}: {score + timeLeft * 10}
          </Text>
          <Button title={translations.nextLevelText || 'Next Level'} onPress={goToNextLevel} />
        </View>
      )}
      {gameOver && (
        <View style={styles.endBlock}>
          <Text style={styles.gameOver}>{translations.gameOverText || 'Game Over!'}
            {'\n'}{translations.finalScoreLabel || 'Final Score'}: {score + timeLeft * 10}
          </Text>
          <Button title={translations.retryText || 'Retry'} onPress={retryLevel} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  score: {
    fontSize: 20,
    marginBottom: 10,
  },
  timer: {
    fontSize: 16,
    marginBottom: 10,
  },
  candy: {
    width: CANDY_SIZE,
    height: CANDY_SIZE,
  },
  gameOver: {
    marginTop: 20,
    fontSize: 18,
    textAlign: 'center',
  },
  selected: {
    borderWidth: 2,
    borderColor: 'orange',
    borderRadius: 4,
  },
  endBlock: {
    marginTop: 20,
    alignItems: 'center',
    gap: 10,
  },
});
