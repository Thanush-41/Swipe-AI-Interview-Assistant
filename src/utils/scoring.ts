import type { CandidateRecord, Difficulty, InterviewQuestion } from '../types/interview'

const keywordBank: Record<Difficulty, string[]> = {
  easy: ['state', 'props', 'component', 'useeffect', 'express'],
  medium: ['optimization', 'performance', 'security', 'validation', 'middleware'],
  hard: ['scalability', 'distributed', 'observability', 'feature flag', 'real-time', 'resilience'],
}

export const scoreAnswer = (answer: string, difficulty: Difficulty): number => {
  const cleaned = answer.trim().toLowerCase()
  if (!cleaned) return 0

  const wordCount = cleaned.split(/\s+/).length
  const lengthScore = Math.min(60, wordCount * 2)

  const keywords = keywordBank[difficulty]
  const keywordMatches = keywords.reduce((acc, keyword) => {
    return cleaned.includes(keyword) ? acc + 1 : acc
  }, 0)

  const keywordScore = Math.min(30, keywordMatches * 10)
  const structureScore = cleaned.includes('example') || cleaned.includes('for instance') ? 10 : 0

  const total = lengthScore + keywordScore + structureScore
  return Math.min(100, Math.round(total))
}

const difficultyWeight: Record<Difficulty, number> = {
  easy: 0.2,
  medium: 0.3,
  hard: 0.5,
}

export const computeFinalScore = (questions: InterviewQuestion[]): number => {
  if (!questions.length) return 0

  const weighted = questions.reduce((acc, question) => {
    const weight = difficultyWeight[question.difficulty]
    const score = question.score ?? 0
    return acc + score * weight
  }, 0)

  return Math.round(weighted)
}

export const buildCandidateSummary = (candidate: CandidateRecord): string => {
  const answered = candidate.questions.filter((q) => q.status !== 'pending')
  if (!answered.length) {
    return 'Candidate did not provide answers for evaluation.'
  }

  const strengths: string[] = []
  const improvements: string[] = []

  for (const question of answered) {
    if ((question.score ?? 0) >= 70) {
      strengths.push(`Strong on ${question.prompt.toLowerCase()}`)
    } else if ((question.score ?? 0) <= 30) {
      improvements.push(`Needs deeper coverage on ${question.prompt.toLowerCase()}`)
    }
  }

  const strengthSentence = strengths.length
    ? `Notable strengths: ${strengths.slice(0, 2).join('; ')}.`
    : 'Strengths were not clearly demonstrated during the interview.'

  const improvementSentence = improvements.length
    ? `Focus areas: ${improvements.slice(0, 2).join('; ')}.`
    : 'No major red flags detected; consider digging deeper in a follow-up conversation.'

  return `${strengthSentence} ${improvementSentence}`
}
