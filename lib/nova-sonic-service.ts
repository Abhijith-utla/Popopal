import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'
import { awsCredentials } from './amplify-config'

export interface NovaSonicConfig {
  region: string
  modelId: string
  knowledgeBaseId: string
  outputBucket: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface NovaSonicResponse {
  content: string
  sources?: string[]
  confidence?: number
}

class NovaSonicService {
  private bedrockClient: BedrockRuntimeClient
  private s3Client: S3Client
  private config: NovaSonicConfig

  constructor() {
    this.config = {
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
      modelId: process.env.NEXT_PUBLIC_NOVA_MODEL_ID || 'amazon.nova-sonic-v1:0', // Nova Sonic model ID
      knowledgeBaseId: process.env.NEXT_PUBLIC_NOVA_KNOWLEDGE_BASE_ID || 'your-knowledge-base-id',
      outputBucket: 'popopal-outputs'
    }

    this.bedrockClient = new BedrockRuntimeClient({
      region: this.config.region,
      credentials: {
        accessKeyId: awsCredentials.accessKeyId,
        secretAccessKey: awsCredentials.secretAccessKey,
      }
    })

    this.s3Client = new S3Client({
      region: this.config.region,
      credentials: {
        accessKeyId: awsCredentials.accessKeyId,
        secretAccessKey: awsCredentials.secretAccessKey,
      }
    })
  }

  /**
   * Retrieve context from S3 output bucket for RAG
   */
  async retrieveContext(query: string): Promise<string> {
    try {
      console.log('🔍 Retrieving context from S3 bucket for RAG...')
      
      // List all files in the output bucket
      const listCommand = new ListObjectsV2Command({
        Bucket: this.config.outputBucket,
        MaxKeys: 10
      })

      const listResponse = await this.s3Client.send(listCommand)
      
      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        console.log('📄 No files found in output bucket')
        return ''
      }

      // Get the most recent report file
      const latestFile = listResponse.Contents
        .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))[0]

      if (!latestFile.Key) {
        console.log('❌ No valid file key found')
        return ''
      }

      console.log(`📄 Retrieving content from: ${latestFile.Key}`)

      // Download the file content
      const getCommand = new GetObjectCommand({
        Bucket: this.config.outputBucket,
        Key: latestFile.Key
      })

      const getResponse = await this.s3Client.send(getCommand)
      
      if (!getResponse.Body) {
        console.log('❌ No content found in file')
        return ''
      }

      // Convert stream to string
      const chunks: Uint8Array[] = []
      const stream = getResponse.Body as any
      
      for await (const chunk of stream) {
        chunks.push(chunk)
      }
      
      const content = Buffer.concat(chunks).toString('utf-8')
      console.log(`✅ Retrieved ${content.length} characters of context`)
      
      return content
    } catch (error) {
      console.error('❌ Error retrieving context:', error)
      return ''
    }
  }

  /**
   * Generate response using Nova Sonic with RAG context
   */
  async generateResponse(messages: ChatMessage[]): Promise<NovaSonicResponse> {
    try {
      console.log('🤖 Generating response with Nova Sonic...')
      
      // Get the latest user message
      const lastMessage = messages[messages.length - 1]
      if (!lastMessage || lastMessage.role !== 'user') {
        throw new Error('No user message found')
      }

      // Retrieve context from S3
      const context = await this.retrieveContext(lastMessage.content)
      
      // Prepare the prompt with RAG context
      const systemPrompt = `You are an AI assistant specialized in analyzing police reports and video analysis. 
Use the following context from recent reports to provide accurate, helpful responses:

CONTEXT:
${context}

Instructions:
- Answer questions based on the provided context
- If the context doesn't contain relevant information, say so politely
- Focus on police procedures, incident analysis, and evidence interpretation
- Be professional and accurate in your responses
- Cite specific details from the reports when available`

      // Prepare messages for Nova Sonic
      const novaMessages = [
        {
          role: 'system',
          content: systemPrompt
        },
        ...messages.slice(-5) // Keep last 5 messages for context
      ]

      // Prepare the request payload for Nova Sonic
      const requestBody = {
        messages: novaMessages,
        inferenceConfig: {
          maxTokens: 1000,
          temperature: 0.7,
          topP: 0.9
        },
        additionalModelRequestFields: {
          knowledgeBaseId: this.config.knowledgeBaseId
        }
      }

      console.log('📤 Sending request to Nova Sonic...')

      const command = new InvokeModelCommand({
        modelId: this.config.modelId,
        body: JSON.stringify(requestBody),
        contentType: 'application/json'
      })

      const response = await this.bedrockClient.send(command)
      
      if (!response.body) {
        throw new Error('No response body received')
      }

      // Parse the response
      const responseText = new TextDecoder().decode(response.body)
      const responseData = JSON.parse(responseText)
      
      console.log('✅ Nova Sonic response received')
      
      return {
        content: responseData.content || responseData.output || 'No response generated',
        sources: responseData.sources || [],
        confidence: responseData.confidence || 0.8
      }

    } catch (error) {
      console.error('❌ Error generating Nova Sonic response:', error)
      
      // Fallback response
      return {
        content: `I apologize, but I'm having trouble processing your request right now. Please try again in a moment. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sources: [],
        confidence: 0
      }
    }
  }

  /**
   * Speech-to-speech processing (placeholder for future implementation)
   */
  async processSpeechToSpeech(audioInput: ArrayBuffer): Promise<ArrayBuffer> {
    // This would integrate with Amazon Polly for speech synthesis
    // and Amazon Transcribe for speech recognition
    // For now, returning placeholder
    console.log('🎤 Speech-to-speech processing not yet implemented')
    throw new Error('Speech-to-speech processing not yet implemented')
  }

  /**
   * Check if Nova Sonic is properly configured
   */
  async checkConfiguration(): Promise<boolean> {
    try {
      console.log('🔧 Checking Nova Sonic configuration...')
      
      // Test basic connectivity
      const testResponse = await this.generateResponse([
        { role: 'user', content: 'Hello, are you working?' }
      ])
      
      return testResponse.content.length > 0
    } catch (error) {
      console.error('❌ Nova Sonic configuration check failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const novaSonicService = new NovaSonicService()

// Export convenience functions
export const generateNovaResponse = (messages: ChatMessage[]) => {
  return novaSonicService.generateResponse(messages)
}

export const retrieveContextFromS3 = (query: string) => {
  return novaSonicService.retrieveContext(query)
}

export const checkNovaConfiguration = () => {
  return novaSonicService.checkConfiguration()
}

// Export types
export type { NovaSonicConfig as NovaSonicConfigType, ChatMessage as ChatMessageType, NovaSonicResponse as NovaSonicResponseType }
