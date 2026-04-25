import { GoogleGenAI } from '@google/genai';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  success: boolean;
  message?: string;
  error?: string;
}

class GeminiService {
  private genAI: GoogleGenAI | null = null;
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private minRequestInterval = 2000; // 2 seconds between requests

  constructor() {
    this.initializeAI();
  }

  private initializeAI() {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        console.error('GEMINI_API_KEY is not configured');
        return;
      }

      this.genAI = new GoogleGenAI({
        apiKey: apiKey,
      });
    } catch (error) {
      console.error('Failed to initialize Gemini AI:', error);
    }
  }

  async generateResponse(
    message: string, 
    conversationHistory?: ChatMessage[]
  ): Promise<ChatResponse> {
    // Add to queue and wait for processing
    return new Promise((resolve) => {
      this.requestQueue.push(async () => {
        try {
          if (!this.genAI) {
            resolve({
              success: false,
              error: 'Gemini AI is not properly configured. Please check your API key.'
            });
            return;
          }

          // Rate limiting - ensure minimum interval between requests
          const now = Date.now();
          const timeSinceLastRequest = now - this.lastRequestTime;
          if (timeSinceLastRequest < this.minRequestInterval) {
            await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
          }
          this.lastRequestTime = Date.now();

          // Build conversation contents array
          const contents = [];
          
          // Add system message
          contents.push({
            role: 'user',
            parts: [{
              text: this.buildSystemPrompt()
            }]
          });
          
          // Add conversation history
          if (conversationHistory && conversationHistory.length > 0) {
            const recentHistory = conversationHistory.slice(-6);
            recentHistory.forEach(msg => {
              contents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{
                  text: msg.content
                }]
              });
            });
          }
          
          // Add current user message
          contents.push({
            role: 'user',
            parts: [{
              text: message
            }]
          });

          const response = await this.genAI.models.generateContent({
            model: 'gemini-2.0-flash',   // gemini-2.5-pro has zero free-tier quota
            contents: contents,
          });

          if (!response || !response.text) {
            resolve({
              success: false,
              error: 'No response generated from AI'
            });
            return;
          }

          resolve({
            success: true,
            message: response.text.trim()
          });

        } catch (error: any) {
          console.error('Error generating AI response:', error);
          
          // Handle rate limit / quota errors — extract retry delay if present
          if (error?.status === 429 || error?.message?.includes('quota') || error?.message?.includes('RATE_LIMIT_EXCEEDED') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
            // Try to pull retryDelay from the API error body
            let retrySeconds: number | null = null;
            try {
              const parsed = typeof error?.message === 'string' ? JSON.parse(error.message) : null;
              const retryInfo = parsed?.error?.details?.find((d: any) => d['@type']?.includes('RetryInfo'));
              if (retryInfo?.retryDelay) {
                retrySeconds = parseInt(String(retryInfo.retryDelay).replace('s', ''), 10);
              }
            } catch { /* ignore parse failure */ }

            const waitMsg = retrySeconds && retrySeconds > 0
              ? `AI quota reached. Please retry in ${retrySeconds} seconds.`
              : 'AI quota reached. Please wait a moment and try again.';

            resolve({ success: false, error: waitMsg });
            return;
          }
          
          if (error?.message?.includes('API_KEY')) {
            resolve({
              success: false,
              error: 'AI service configuration issue. Please contact support.'
            });
            return;
          }

          resolve({
            success: false,
            error: 'I\'m having trouble processing your request right now. Please try again in a moment.'
          });
        }
      });
      
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        await request();
        // Small delay between processing queue items
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    this.isProcessingQueue = false;
  }

  private buildSystemPrompt(): string {
    return `You are StockMaster AI, an intelligent assistant for the StockMaster inventory management system. 

Your role is to help users with:
1. Inventory and stock management questions
2. Understanding system features and workflows
3. General guidance on best practices for warehouse operations
4. Interpreting dashboard data and analytics
5. Troubleshooting common inventory issues

Key StockMaster features you should know about:
- Multi-warehouse inventory tracking
- Product management with locations
- Stock movements: Receipts, Deliveries, Transfers, Requisitions, Adjustments
- Role-based access (Admin, Manager, Operator)
- Real-time stock levels and analytics
- Low stock alerts and reporting
- Approval workflows for transfers and adjustments

Guidelines:
- Be helpful, concise, and professional
- Focus on inventory management context
- If asked about features not in StockMaster, politely redirect to system capabilities
- Provide actionable advice when possible
- Ask clarifying questions if the user's request is unclear
- Keep responses under 200 words unless more detail is specifically requested

Remember: You're an assistant for an inventory management system, so keep your responses relevant to that context.`;
  }

  // Validate API key configuration
  isConfigured(): boolean {
    return this.genAI !== null;
  }

  // Get a quick health check
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isConfigured()) return false;
      
      const response = await this.genAI!.models.generateContent({
        model: 'gemini-2.0-flash',   // consistent with generateResponse model
        contents: [{
          role: 'user',
          parts: [{ text: 'Hello' }]
        }]
      });
      return !!response.text;
    } catch {
      return false;
    }
  }
}

export const geminiService = new GeminiService();
