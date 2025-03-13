// ✅ ОНОВЛЕНИЙ CandyGameScreen.tsx з анімацією падіння цукерок
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
  require('../assets/bonus_row_clean.png'),
  require('../assets/bonus_col_clean.png'),
];

const BONUS_ROW_INDEX = candyImages.length - 2;
const BONUS_COL_INDEX = candyImages.length - 1;

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
  const currentLevel = levels.find((l) => l.id === level) || levels[0];
  const [grid, setGrid] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(currentLevel.duration);
  const [gameOver, setGameOver] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const scaleAnim = useRef(Array(GRID_SIZE * GRID_SIZE).fill(0).map(() => new Animated.Value(1))).current;
  const opacityAnim = useRef(Array(GRID_SIZE * GRID_SIZE).fill(0).map(() => new Animated.Value(1))).current;
  const fallAnim = useRef(Array(GRID_SIZE * GRID_SIZE).fill(0).map(() => new Animated.Value(0))).current;
  const translateYAnim = useRef<Animated.Value[]>(Array(GRID_SIZE * GRID_SIZE).fill(0).map(() => new Animated.Value(0)));

  const animateFall = (index: number) => {
    fallAnim[index].setValue(-CANDY_SIZE * 2);
    Animated.timing(fallAnim[index], {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

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
    } catch (e) { console.error('Failed to save score', e); }
  };

  const loadLevel = async () => {
    try {
      const saved = await AsyncStorage.getItem('current_level');
      if (saved) setLevel(parseInt(saved, 10));
    } catch (e) { console.error('Failed to load level', e); }
    setTimeout(() => setLoading(false), 800);
  };

  const saveLevel = async (newLevel: number) => {
    try {
      await AsyncStorage.setItem('current_level', String(newLevel));
    } catch (e) { console.error('Failed to save level', e); }
  };

  useEffect(() => { loadLevel(); }, []);

  useEffect(() => {
    if (loading) return;
    generateGrid();
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          score >= currentLevel.targetScore ? setLevelComplete(true) : setGameOver(true);
          saveLevel(level + 1);
          saveScore();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [level, loading]);

  const goToNextLevel = () => {
    const next = level + 1;
    setLevel(next);
    saveLevel(next);
    setScore(0);
    setTimeLeft((levels[next]?.duration || 60));
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

  const handleCandyPress = (index: number) => {
    const value = grid[index];
    if (value === BONUS_ROW_INDEX) return clearRow(index);
    if (value === BONUS_COL_INDEX) return clearColumn(index);
    if (selectedIndex === null) {
      setSelectedIndex(index);
      animatePress(index);
    } else {
      if (isAdjacent(selectedIndex, index)) swapCandies(selectedIndex, index);
      setSelectedIndex(null);
    }
  };

  const isAdjacent = (i1: number, i2: number) => {
    const [r1, c1] = [Math.floor(i1 / GRID_SIZE), i1 % GRID_SIZE];
    const [r2, c2] = [Math.floor(i2 / GRID_SIZE), i2 % GRID_SIZE];
    return (Math.abs(r1 - r2) === 1 && c1 === c2) || (Math.abs(c1 - c2) === 1 && r1 === r2);
  };

  const animatePress = (index: number) => {
    Animated.sequence([
      Animated.timing(scaleAnim[index], { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim[index], { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const animateDisappear = (index: number) => {
    Animated.timing(opacityAnim[index], { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
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
    setScore((s) => s + 100);
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
    setScore((s) => s + 100);
    setTimeout(() => refillGrid(newGrid), 400);
  };

  const swapCandies = (i1: number, i2: number) => {
    const newGrid = [...grid];
    [newGrid[i1], newGrid[i2]] = [newGrid[i2], newGrid[i1]];
    setGrid(newGrid);
    checkMatches(newGrid);
  };

  const checkMatches = (gridData: number[]) => {
    const newGrid = [...gridData];
    let matched = false;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE - 2; col++) {
        const i = row * GRID_SIZE + col;
        if (newGrid[i] !== -1 && newGrid[i] === newGrid[i + 1] && newGrid[i] === newGrid[i + 2]) {
          newGrid[i] = newGrid[i + 1] = newGrid[i + 2] = -1;
          animateDisappear(i);
          animateDisappear(i + 1);
          animateDisappear(i + 2);
          matched = true;
          setScore((s) => s + 30);
        }
      }
    }
    for (let col = 0; col < GRID_SIZE; col++) {
      for (let row = 0; row < GRID_SIZE - 2; row++) {
        const i = row * GRID_SIZE + col;
        if (newGrid[i] !== -1 && newGrid[i] === newGrid[i + GRID_SIZE] && newGrid[i] === newGrid[i + GRID_SIZE * 2]) {
          newGrid[i] = newGrid[i + GRID_SIZE] = newGrid[i + GRID_SIZE * 2] = -1;
          animateDisappear(i);
          animateDisappear(i + GRID_SIZE);
          animateDisappear(i + GRID_SIZE * 2);
          matched = true;
          setScore((s) => s + 30);
        }
      }
    }
    if (matched) {
      setGrid(newGrid);
      setTimeout(() => refillGrid(newGrid), 400);
    }
  };


  const refillGrid = (gridData: number[]) => {
    const newGrid = [...gridData];
    const newAnimations = [...translateYAnim.current]; // translateYAnim: useRef([...Array(GRID_SIZE * GRID_SIZE)].map(() => new Animated.Value(0)))
  
    for (let col = 0; col < GRID_SIZE; col++) {
      let emptySlots: number[] = [];
  
      for (let row = GRID_SIZE - 1; row >= 0; row--) {
        const index = row * GRID_SIZE + col;
  
        if (newGrid[index] === -1) {
          emptySlots.push(index);
        } else if (emptySlots.length > 0) {
          const emptyIndex = emptySlots.shift()!;
          newGrid[emptyIndex] = newGrid[index];
          newGrid[index] = -1;
          emptySlots.push(index);
  
          // Animate "fall"
          Animated.timing(newAnimations[emptyIndex], {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }
      }
  
      for (let i = 0; i < emptySlots.length; i++) {
        const idx = emptySlots[i];
        newGrid[idx] = Math.floor(Math.random() * currentLevel.candyTypes);
  
        // Animate new falling candy
        newAnimations[idx].setValue(-CANDY_SIZE * GRID_SIZE); // start from top
        Animated.timing(newAnimations[idx], {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }
  
    setGrid(newGrid);
    translateYAnim.current = newAnimations;
  };
  

  const renderCandy = useCallback(({ item, index }: { item: number; index: number }) => (
    <TouchableOpacity onPress={() => handleCandyPress(index)}>
      <Animated.View
        style={[
          {
            transform: [
              { scale: scaleAnim[index] },
              { translateY: translateYAnim.current[index] },
            ],
            opacity: opacityAnim[index],
          },
          selectedIndex === index && styles.selected,
        ]}>
        {item >= 0 && <Image source={candyImages[item]} style={styles.candy} />}
      </Animated.View>
    </TouchableOpacity>
  ), [selectedIndex]);

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" /><Text>{translations.loadingLevelText || 'Loading...'}</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.score}>{translations.scoreLabel || 'Score'}: {score}</Text>
      <Text style={styles.timer}>{translations.timeLeftLabel || 'Time'}: {timeLeft}s</Text>
      <FlatList
        data={grid}
        renderItem={renderCandy}
        keyExtractor={(_, i) => i.toString()}
        numColumns={GRID_SIZE}
        scrollEnabled={false}
      />
      {levelComplete && <View style={styles.endBlock}><Text>{translations.levelCompleteText || 'Level Complete!'}</Text><Button title={translations.nextLevelText || 'Next Level'} onPress={goToNextLevel} /></View>}
      {gameOver && <View style={styles.endBlock}><Text>{translations.gameOverText || 'Game Over!'}</Text><Button title={translations.retryText || 'Retry'} onPress={retryLevel} /></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, backgroundColor: '#fff', alignItems: 'center' },
  score: { fontSize: 20, marginBottom: 10 },
  timer: { fontSize: 16, marginBottom: 10 },
  candy: { width: CANDY_SIZE, height: CANDY_SIZE },
  selected: { borderWidth: 2, borderColor: 'orange', borderRadius: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  endBlock: { marginTop: 20, alignItems: 'center', gap: 10 },
});
