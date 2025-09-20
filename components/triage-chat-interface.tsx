"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send, Bot, User, Activity, Brain, BookOpen } from "lucide-react"
import { mockLLM, generateExplanation } from "@/lib/mock-llm"
import { searchKnowledgeBase, getEntriesByType, type KnowledgeBaseEntry } from "@/lib/knowledge-base"

interface Message {
  id: string
  content: string
  sender: "user" | "ai"
  timestamp: Date
}

interface TriageResult {
  priority: "low" | "medium" | "high" | "critical"
  category: string
  confidence: number
  recommendation: string
}

interface ExplainabilityData {
  factors: Array<{
    factor: string
    weight: number
    impact: "positive" | "negative" | "neutral"
  }>
  reasoning: string
}

export default function TriageChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hello! I'm here to help with your mental health triage assessment. Please describe how you're feeling or any concerns you have.",
      sender: "ai",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [triageResult, setTriageResult] = useState<TriageResult | null>({
    priority: "medium",
    category: "Initial Assessment",
    confidence: 85,
    recommendation: "Continue monitoring symptoms and provide additional details for more accurate assessment.",
  })
  const [explainability, setExplainability] = useState<ExplainabilityData | null>({
    factors: [
      { factor: "Symptom severity", weight: 0.35, impact: "positive" },
      { factor: "Duration of symptoms", weight: 0.25, impact: "neutral" },
      { factor: "Patient history", weight: 0.2, impact: "negative" },
      { factor: "Risk factors", weight: 0.2, impact: "neutral" },
    ],
    reasoning:
      "The assessment considers multiple clinical factors including symptom presentation, temporal patterns, and patient-specific risk factors to determine appropriate care level.",
  })
  const [relevantResources, setRelevantResources] = useState<KnowledgeBaseEntry[]>([])

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])

    const mockSensorData = {
      mood: "low", // Simulated sensor data
      heartRate: Math.floor(Math.random() * 40) + 80, // Random heart rate between 80-120
    }

    const llmResponse = mockLLM(inputValue, mockSensorData)

    const resources = searchKnowledgeBase(inputValue)
    const crisisResources = getEntriesByType("crisis resource")
    const cbtTechniques = getEntriesByType("CBT technique")

    // Combine relevant resources based on analysis
    let combinedResources = [...resources]
    if (llmResponse.redFlags.length > 0) {
      combinedResources = [...combinedResources, ...crisisResources]
    }
    if (llmResponse.primarySymptom === "anxiety" || llmResponse.primarySymptom === "depression") {
      combinedResources = [...combinedResources, ...cbtTechniques.slice(0, 2)]
    }

    // Remove duplicates and limit to 4 resources
    const uniqueResources = combinedResources
      .filter((resource, index, self) => index === self.findIndex((r) => r.id === resource.id))
      .slice(0, 4)

    setRelevantResources(uniqueResources)

    const currentUserText = inputValue
    setInputValue("")

    setTimeout(() => {
      const empathicExplanation = generateExplanation(currentUserText, llmResponse, uniqueResources)

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Thank you for sharing that with me. Based on your message, I've identified "${llmResponse.primarySymptom.replace("_", " ")}" as the primary concern. ${
          llmResponse.redFlags.length > 0
            ? `I've also noted some important flags: ${llmResponse.redFlags.join(", ")}. `
            : ""
        }Let me provide you with an appropriate assessment and recommendations.${
          uniqueResources.length > 0 ? " I've also found some relevant resources that might help." : ""
        }`,
        sender: "ai",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])

      const getPriorityFromAnalysis = (primarySymptom: string, redFlags: string[]) => {
        if (redFlags.includes("immediate self-harm risk") || redFlags.includes("violence risk")) {
          return "critical"
        }
        if (redFlags.includes("suicidal ideation") || redFlags.includes("severe physiological distress")) {
          return "high"
        }
        if (redFlags.length > 0) {
          return "high"
        }
        if (primarySymptom !== "general_concern") {
          return "medium"
        }
        return "low"
      }

      const priority = getPriorityFromAnalysis(llmResponse.primarySymptom, llmResponse.redFlags)

      setTriageResult({
        priority: priority as "low" | "medium" | "high" | "critical",
        category: `Mental Health - ${llmResponse.primarySymptom.replace("_", " ").toUpperCase()}`,
        confidence: 88,
        recommendation:
          priority === "critical"
            ? "IMMEDIATE ATTENTION REQUIRED: Contact emergency services or crisis hotline immediately."
            : priority === "high"
              ? "Recommend urgent mental health evaluation within 24 hours. Consider crisis intervention resources."
              : "Recommend scheduling mental health consultation within 1-2 weeks. Monitor symptoms closely.",
      })

      setExplainability({
        factors: [
          {
            factor: "Text analysis",
            weight: 0.4,
            impact: llmResponse.primarySymptom !== "general_concern" ? "positive" : "neutral",
          },
          {
            factor: "Red flag detection",
            weight: 0.3,
            impact: llmResponse.redFlags.length > 0 ? "positive" : "neutral",
          },
          { factor: "Sensor data (HR)", weight: 0.2, impact: mockSensorData.heartRate > 100 ? "positive" : "neutral" },
          { factor: "Mood indicators", weight: 0.1, impact: mockSensorData.mood === "low" ? "positive" : "neutral" },
        ],
        reasoning: empathicExplanation,
      })
    }, 1500)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "bg-accent text-accent-foreground"
      case "medium":
        return "bg-primary text-primary-foreground"
      case "high":
        return "bg-destructive text-destructive-foreground"
      case "critical":
        return "bg-red-600 text-white"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "positive":
        return "text-accent"
      case "negative":
        return "text-destructive"
      case "neutral":
        return "text-muted-foreground"
      default:
        return "text-foreground"
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border p-4">
        <h1 className="text-2xl font-semibold text-foreground">Mental Health Triage Assistant</h1>
        <p className="text-sm text-muted-foreground">AI-powered mental health assessment and care guidance</p>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
        {/* Left Column - Triage Output and Explainability */}
        <div className="lg:w-1/3 space-y-4 overflow-y-auto">
          {/* Triage Output Section */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Activity className="h-5 w-5 text-primary" />
                Triage Output
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {triageResult ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-card-foreground">Priority Level</span>
                    <Badge className={getPriorityColor(triageResult.priority)}>
                      {triageResult.priority.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-card-foreground">Category</span>
                    <span className="text-sm text-muted-foreground">{triageResult.category}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-card-foreground">Confidence</span>
                    <span className="text-sm text-muted-foreground">{triageResult.confidence}%</span>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm text-card-foreground font-medium mb-2">Recommendation</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{triageResult.recommendation}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Triage assessment will appear here after symptom analysis.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Explainability Section */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Brain className="h-5 w-5 text-accent" />
                Explainability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {explainability ? (
                <>
                  <div>
                    <p className="text-sm font-medium text-card-foreground mb-3">Decision Factors</p>
                    <div className="space-y-2">
                      {explainability.factors.map((factor, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-card-foreground">{factor.factor}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${getImpactColor(factor.impact)}`}>
                              {Math.round(factor.weight * 100)}%
                            </span>
                            <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${factor.weight * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm font-medium text-card-foreground mb-2">AI Reasoning</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{explainability.reasoning}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Decision analysis will appear here after assessment.</p>
              )}
            </CardContent>
          </Card>

          {/* Knowledge Base Resources Section */}
          {relevantResources.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <BookOpen className="h-5 w-5 text-accent" />
                  Relevant Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {relevantResources.map((resource) => (
                  <div key={resource.id} className="p-3 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {resource.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-card-foreground leading-relaxed">{resource.text}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Chat Interface */}
        <div className="lg:w-2/3 flex flex-col bg-card rounded-lg border border-border">
          {/* Chat Header */}
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-card-foreground">Mental Health Assessment Chat</h2>
            <p className="text-sm text-muted-foreground">Share your feelings and concerns for personalized triage</p>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.sender === "ai" && (
                  <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-muted text-card-foreground"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {message.sender === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-accent-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="How are you feeling today? Describe your concerns..."
                className="flex-1 bg-input border-border text-foreground placeholder:text-muted-foreground"
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <Button
                onClick={handleSendMessage}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Enter to send • This is a demo interface for mental health triage assessment
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
