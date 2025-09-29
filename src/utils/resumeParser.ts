import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { extractRawText } from 'mammoth/mammoth.browser'
import type { CandidateProfile } from '../types/interview'

GlobalWorkerOptions.workerSrc = pdfWorker

const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const phoneRegex = /(\+?\d{1,3}[\s-]?)?(\(?\d{3}\)?[\s-]?)?\d{3}[\s-]?\d{4}/

const sanitizeLine = (line: string) => line.replace(/[^a-zA-Z\s'-]/g, '').trim()

const guessName = (text: string) => {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  for (const line of lines.slice(0, 10)) {
    if (line.match(emailRegex) || line.toLowerCase().includes('resume')) continue
    const sanitized = sanitizeLine(line)
    if (!sanitized) continue
    const parts = sanitized.split(/\s+/)
    if (parts.length >= 2 && parts.length <= 4) {
      return parts
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ')
    }
  }
  return undefined
}

const extractPdfText = async (file: File): Promise<string> => {
  const data = await file.arrayBuffer()
  const document = await getDocument({ data }).promise
  const lines: string[] = []

  for (let i = 1; i <= document.numPages; i += 1) {
    const page = await document.getPage(i)
    const textContent = await page.getTextContent()
    lines.push(
      textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
    )
  }

  return lines.join('\n')
}

const extractDocxText = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer()
  const result = await extractRawText({ arrayBuffer })
  return result.value
}

const extractFields = (text: string): CandidateProfile => {
  const email = text.match(emailRegex)?.[0]
  const phone = text.match(phoneRegex)?.[0]?.replace(/\s+/g, ' ')
  const name = guessName(text)

  return {
    name,
    email,
    phone,
    resumeText: text,
  }
}

export const parseResumeFile = async (file: File): Promise<CandidateProfile> => {
  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    throw new Error('File too large. Please upload a resume smaller than 10MB.')
  }

  const extension = file.name.split('.').pop()?.toLowerCase()

  try {
    if (extension === 'pdf') {
      const text = await extractPdfText(file)
      if (!text.trim()) {
        throw new Error('The PDF appears to be empty or contains only images. Please upload a text-based resume.')
      }
      return {
        resumeFileName: file.name,
        ...extractFields(text),
      }
    }

    if (extension === 'docx') {
      const text = await extractDocxText(file)
      if (!text.trim()) {
        throw new Error('The DOCX file appears to be empty. Please upload a valid resume with text content.')
      }
      return {
        resumeFileName: file.name,
        ...extractFields(text),
      }
    }

    throw new Error('Unsupported file format. Please upload a PDF or DOCX resume.')
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF') || error.message.includes('corrupted')) {
        throw new Error('The PDF file appears to be corrupted or invalid. Please try a different file.')
      }
      if (error.message.includes('password') || error.message.includes('encrypted')) {
        throw new Error('Password-protected files are not supported. Please upload an unprotected resume.')
      }
      throw error
    }
    throw new Error('Unable to process the file. Please ensure it is a valid PDF or DOCX resume.')
  }
}

export const missingProfileFields = (profile: CandidateProfile): Array<'name' | 'email' | 'phone'> => {
  const missing: Array<'name' | 'email' | 'phone'> = []
  if (!profile.name) missing.push('name')
  if (!profile.email) missing.push('email')
  if (!profile.phone) missing.push('phone')
  return missing
}

const guessNameFromChat = (message: string): string | undefined => {
  const trimmed = message.trim()
  
  // If it looks like an email or phone, skip it
  if (emailRegex.test(trimmed) || phoneRegex.test(trimmed)) {
    return undefined
  }
  
  // Remove punctuation and extra spaces
  const cleaned = trimmed.replace(/[^\w\s'-]/g, '').trim()
  if (!cleaned) return undefined
  
  // Split into words
  const words = cleaned.split(/\s+/).filter(Boolean)
  
  // Accept 1-4 words as a potential name
  if (words.length >= 1 && words.length <= 4) {
    // Check if it looks like a name (starts with capital or can be capitalized)
    const nameCandidate = words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
    
    // Avoid common non-name phrases
    const lowerMessage = message.toLowerCase()
    const skipPhrases = ['yes', 'no', 'ok', 'okay', 'sure', 'hi', 'hello', 'thanks', 'thank you']
    if (skipPhrases.some(phrase => lowerMessage.includes(phrase) && lowerMessage.length < 15)) {
      return undefined
    }
    
    return nameCandidate
  }
  
  return undefined
}

export const enrichProfileFromMessage = (
  message: string,
  profile: CandidateProfile
): CandidateProfile => {
  const email = message.match(emailRegex)?.[0]
  const phone = message.match(phoneRegex)?.[0]
  
  // Use different name extraction logic for chat messages vs resume parsing
  const possibleName = profile.name ? undefined : guessNameFromChat(message)

  return {
    ...profile,
    name: profile.name ?? possibleName,
    email: profile.email ?? email,
    phone: profile.phone ?? phone,
  }
}
