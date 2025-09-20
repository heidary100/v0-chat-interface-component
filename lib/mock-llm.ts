import type { KnowledgeBaseEntry } from "./knowledge-base"

interface MockSensorData {
  mood?: string
  heartRate?: number
}

interface TriageResponse {
  primarySymptom: string
  redFlags: string[]
}

export function mockLLM(userText: string, mockSensorData: MockSensorData): TriageResponse {
  const text = userText.toLowerCase()
  let primarySymptom = "general_concern"
  const redFlags: string[] = []

  // Analyze text for depression indicators
  if (
    text.includes("hopeless") ||
    text.includes("no point") ||
    text.includes("worthless") ||
    text.includes("empty") ||
    text.includes("sad") ||
    text.includes("depressed")
  ) {
    primarySymptom = "depression"

    // Check for suicidal ideation
    if (
      text.includes("hopeless") ||
      text.includes("no point") ||
      text.includes("end it all") ||
      text.includes("kill myself") ||
      text.includes("suicide") ||
      text.includes("die")
    ) {
      redFlags.push("suicidal ideation")
    }
  }

  // Analyze text for anxiety indicators
  if (
    text.includes("anxious") ||
    text.includes("worried") ||
    text.includes("panic") ||
    text.includes("nervous") ||
    text.includes("scared") ||
    text.includes("fear")
  ) {
    primarySymptom = primarySymptom === "depression" ? "mixed_anxiety_depression" : "anxiety"

    if (text.includes("panic") || text.includes("can't breathe") || text.includes("heart racing")) {
      redFlags.push("panic attack")
    }
  }

  // Analyze text for trauma/PTSD indicators
  if (
    text.includes("flashback") ||
    text.includes("nightmare") ||
    text.includes("trauma") ||
    text.includes("triggered") ||
    text.includes("reliving")
  ) {
    primarySymptom = "ptsd"
    redFlags.push("trauma response")
  }

  // Analyze text for substance abuse indicators
  if (
    text.includes("drinking") ||
    text.includes("drugs") ||
    text.includes("high") ||
    text.includes("drunk") ||
    text.includes("addiction")
  ) {
    primarySymptom = "substance_abuse"
    redFlags.push("substance use concern")
  }

  // Analyze sensor data
  if (mockSensorData.heartRate && mockSensorData.heartRate > 100) {
    redFlags.push("panic attack")
    if (primarySymptom === "general_concern") {
      primarySymptom = "anxiety"
    }
  }

  if (mockSensorData.heartRate && mockSensorData.heartRate > 120) {
    redFlags.push("severe physiological distress")
  }

  // Analyze mood data
  if (mockSensorData.mood === "low" || mockSensorData.mood === "very_low") {
    if (primarySymptom === "general_concern") {
      primarySymptom = "depression"
    }
  }

  if (mockSensorData.mood === "agitated" || mockSensorData.mood === "manic") {
    redFlags.push("mood instability")
    primarySymptom = "bipolar_concern"
  }

  // Check for immediate danger keywords
  if (
    text.includes("hurt myself") ||
    text.includes("harm myself") ||
    text.includes("kill myself") ||
    text.includes("suicide")
  ) {
    redFlags.push("immediate self-harm risk")
  }

  if (
    text.includes("hurt others") ||
    text.includes("harm others") ||
    text.includes("violence") ||
    text.includes("kill them")
  ) {
    redFlags.push("violence risk")
  }

  return {
    primarySymptom,
    redFlags: [...new Set(redFlags)], // Remove duplicates
  }
}

export function generateExplanation(
  userText: string,
  structuredQuery: TriageResponse,
  retrievedChunks: KnowledgeBaseEntry[],
): string {
  const { primarySymptom, redFlags } = structuredQuery

  // Create empathetic opening based on primary symptom
  let explanation = ""

  // Identify what triggered the assessment
  const triggers = []
  const text = userText.toLowerCase()

  if (text.includes("hopeless") || text.includes("no point")) {
    triggers.push("feeling hopeless")
  }
  if (text.includes("anxious") || text.includes("worried")) {
    triggers.push("anxiety")
  }
  if (text.includes("panic") || text.includes("can't breathe")) {
    triggers.push("panic symptoms")
  }
  if (text.includes("sad") || text.includes("depressed")) {
    triggers.push("sadness")
  }
  if (text.includes("trauma") || text.includes("flashback")) {
    triggers.push("trauma-related concerns")
  }

  // Build empathetic opening
  if (triggers.length > 0) {
    explanation += `Based on your mention of ${triggers.join(" and ")}, `
  } else {
    explanation += "Based on your message, "
  }

  // Explain the primary symptom identification
  switch (primarySymptom) {
    case "depression":
      explanation += "I identified signs that suggest you may be experiencing depression. "
      break
    case "anxiety":
      explanation += "I identified signs of anxiety. "
      break
    case "mixed_anxiety_depression":
      explanation += "I identified signs of both anxiety and depression. "
      break
    case "ptsd":
      explanation += "I identified signs that may be related to trauma or PTSD. "
      break
    case "substance_abuse":
      explanation += "I identified concerns related to substance use. "
      break
    case "bipolar_concern":
      explanation += "I identified signs of mood instability. "
      break
    default:
      explanation += "I want to provide you with appropriate support. "
  }

  // Add red flag explanations if present
  if (redFlags.length > 0) {
    if (redFlags.includes("suicidal ideation") || redFlags.includes("immediate self-harm risk")) {
      explanation += "I'm particularly concerned about your safety right now. "
    } else if (redFlags.includes("panic attack")) {
      explanation += "I notice signs that you may be experiencing panic symptoms. "
    }
  }

  // Reference knowledge base resources used
  if (retrievedChunks.length > 0) {
    const resourceTypes = [...new Set(retrievedChunks.map((chunk) => chunk.type))]

    if (resourceTypes.includes("crisis resource")) {
      explanation +=
        "I'm recommending crisis resources like the 988 Suicide & Crisis Lifeline because immediate professional support can be crucial in these situations. "
    }

    if (resourceTypes.includes("CBT technique")) {
      explanation +=
        "I've included some coping techniques that have been shown to help manage these feelings in the moment. "
    }

    if (resourceTypes.includes("diagnostic criteria")) {
      explanation +=
        "The symptoms you've described align with established clinical patterns, which helps me provide more targeted support. "
    }

    if (resourceTypes.includes("self-care strategy")) {
      explanation += "I've also included some self-care strategies that many people find helpful. "
    }
  }

  // Empathetic closing
  explanation += "Please remember that you're not alone, and seeking help is a sign of strength."

  return explanation
}
