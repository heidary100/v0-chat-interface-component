import knowledgeBaseData from "../data/mental-health-knowledge-base.json"

export interface KnowledgeBaseEntry {
  id: string
  type: string
  text: string
}

export const knowledgeBase: KnowledgeBaseEntry[] = knowledgeBaseData

export function searchKnowledgeBase(query: string, type?: string): KnowledgeBaseEntry[] {
  const searchTerms = query.toLowerCase().split(" ")

  return knowledgeBase.filter((entry) => {
    // Filter by type if specified
    if (type && entry.type !== type) return false

    // Search in text content
    const entryText = entry.text.toLowerCase()
    return searchTerms.some((term) => entryText.includes(term))
  })
}

export function getEntriesByType(type: string): KnowledgeBaseEntry[] {
  return knowledgeBase.filter((entry) => entry.type === type)
}

export function getRandomEntry(type?: string): KnowledgeBaseEntry | null {
  const entries = type ? getEntriesByType(type) : knowledgeBase
  if (entries.length === 0) return null

  const randomIndex = Math.floor(Math.random() * entries.length)
  return entries[randomIndex]
}
