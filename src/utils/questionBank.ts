import type { Difficulty, InterviewQuestion } from '../types/interview'
import { createId } from './id'

const questionsByDifficulty: Record<Difficulty, string[]> = {
  easy: [
    'Explain the difference between const, let, and var in JavaScript.',
    'How do you lift state up in React?',
    'What is the purpose of useEffect and when does it run?',
    'Describe how to create a simple REST endpoint in Express.',
    'What are props in React and how are they different from state?',
  ],
  medium: [
    'How would you optimize bundle size in a React + Vite app?',
    'Describe the lifecycle of an HTTP request in a Node/Express server.',
    'How do you handle error boundaries in React?',
    'Explain how to design a reusable form component with validation.',
    'What strategies do you use to secure an Express API?',
  ],
  hard: [
    'Design a real-time notification system for a React/Node application.',
    'How would you scale a Node.js backend to handle burst traffic?',
    'Explain how you would implement server-side rendering with hydration.',
    'Describe how to build a feature flag system end-to-end.',
    'How do you instrument full-stack logging and tracing in production?',
  ],
}

const timeLimits: Record<Difficulty, number> = {
  easy: 20,
  medium: 60,
  hard: 120,
}

const pullQuestions = (difficulty: Difficulty, count: number): InterviewQuestion[] => {
  const source = [...questionsByDifficulty[difficulty]]
  const result: InterviewQuestion[] = []

  for (let i = 0; i < count; i += 1) {
    const index = Math.floor(Math.random() * source.length)
    const prompt = source.splice(index, 1)[0] ?? questionsByDifficulty[difficulty][i % questionsByDifficulty[difficulty].length]

    result.push({
      id: createId(),
      prompt,
      difficulty,
      timeLimitSeconds: timeLimits[difficulty],
      status: 'pending',
    })
  }

  return result
}

export const generateQuestionSet = (): InterviewQuestion[] => {
  return [
    ...pullQuestions('easy', 2),
    ...pullQuestions('medium', 2),
    ...pullQuestions('hard', 2),
  ]
}

export const getTimeLimitForDifficulty = (difficulty: Difficulty) => timeLimits[difficulty]
