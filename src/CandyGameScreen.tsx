// src/CandyGameScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity, FlatList, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const GRID_SIZE = 8;
const CANDY_SIZE = width / GRID_SIZE;

const candyImages = [
  require('./assets/candy1.png'),
  require('./assets/candy2.png'),
  require('./assets/candy3.png'),
  require('./assets/candy4.png'),
  require('./assets/candy5.png')
];

interface CandyGameScreenProps {
  level?: number;
  onScoreSaved?: (score: number) => void;
  translations?: {
    scoreLabel?: string;
    timeLeftLabel?: string;
    finalScoreLabel?: string;
    gameOverText?: string;
  };
}

export default function CandyGameScreen({
  level = 1,
  onScoreSaved,
  translations = {},
}: CandyGameScreenProps) {
  const [grid, setGrid] = useState<number[]>([]);
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const generateGrid = () => {
    const newGrid = Array.from({ length: GRID_SIZE * GRID_SIZE }, () => Math.floor(Math.random() * candyImages.length));
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

  useEffect(() => {
    generateGrid();
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setGameOver(true);
          saveScore();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
    if (selectedIndex === null) {
      setSelectedIndex(index);
    } else {
      if (isAdjacent(selectedIndex, index)) {
        swapCandies(selectedIndex, index);
      }
      setSelectedIndex(null);
    }
  };

  const checkMatches = (gridData: number[]) => {
    const newGrid = [...gridData];
    let matchFound = false;

    // Check horizontal matches
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE - 2; col++) {
        const i = row * GRID_SIZE + col;
        if (
          newGrid[i] === newGrid[i + 1] &&
          newGrid[i] === newGrid[i + 2]
        ) {
          matchFound = true;
          newGrid[i] = -1;
          newGrid[i + 1] = -1;
          newGrid[i + 2] = -1;
          setScore((prev) => prev + 30);
        }
      }
    }

    // Check vertical matches
    for (let col = 0; col < GRID_SIZE; col++) {
      for (let row = 0; row < GRID_SIZE - 2; row++) {
        const i = row * GRID_SIZE + col;
        if (
          newGrid[i] === newGrid[i + GRID_SIZE] &&
          newGrid[i] === newGrid[i + GRID_SIZE * 2]
        ) {
          matchFound = true;
          newGrid[i] = -1;
          newGrid[i + GRID_SIZE] = -1;
          newGrid[i + GRID_SIZE * 2] = -1;
          setScore((prev) => prev + 30);
        }
      }
    }

    if (matchFound) {
      refillGrid(newGrid);
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
            newGrid[j] = Math.floor(Math.random() * candyImages.length);
          }
        }
      }
    }
    setGrid(newGrid);
  };

  const renderCandy = useCallback(({ item, index }: { item: number; index: number }) => {
    const highlight = selectedIndex === index;
    return (
      <TouchableOpacity
        onPress={() => handleCandyPress(index)}
        style={highlight ? styles.selected : undefined}
      >
        {item >= 0 && <Image source={candyImages[item]} style={styles.candy} />}
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
      {gameOver && (
        <Text style={styles.gameOver}>{translations.gameOverText || 'Game Over!'}
          {'\n'}{translations.finalScoreLabel || 'Final Score'}: {score + timeLeft * 10}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  },
});
