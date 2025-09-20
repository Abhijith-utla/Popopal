import { NextRequest, NextResponse } from 'next/server'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'

const bedrockClient = new BedrockRuntimeClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
})

const s3Client = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
})

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 })
    }

    console.log('🤖 Nova Sonic API: Processing chat request...')

    // Get the latest user message
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== 'user') {
      return NextResponse.json({ error: 'No user message found' }, { status: 400 })
    }

    // Retrieve context from S3 output bucket
    let context = ''
    try {
      console.log('🔍 Retrieving context from popopal-outputs bucket...')
      
      const listCommand = new ListObjectsV2Command({
        Bucket: 'popopal-outputs',
        MaxKeys: 5
      })

      const listResponse = await s3Client.send(listCommand)
      
      if (listResponse.Contents && listResponse.Contents.length > 0) {
        // Get the most recent report file
        const latestFile = listResponse.Contents
          .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))[0]

        if (latestFile.Key) {
          console.log(`📄 Retrieving content from: ${latestFile.Key}`)

          const getCommand = new GetObjectCommand({
            Bucket: 'popopal-outputs',
            Key: latestFile.Key
          })

          const getResponse = await s3Client.send(getCommand)
          
          if (getResponse.Body) {
            const chunks: Uint8Array[] = []
            const stream = getResponse.Body as any
            
            for await (const chunk of stream) {
              chunks.push(chunk)
            }
            
            context = Buffer.concat(chunks).toString('utf-8')
            console.log(`✅ Retrieved ${context.length} characters of context`)
          }
        }
      }
    } catch (contextError) {
      console.error('❌ Error retrieving context:', contextError)
      // Continue without context
    }

    // Prepare system prompt with RAG context
    const systemPrompt = `You are an AI assistant specialized in analyzing police reports and video analysis. 
Use the following context from recent reports to provide accurate, helpful responses:

CONTEXT:
${context || 'No recent reports available.'}

Instructions:
- Answer questions based on the provided context when available
- If the context doesn't contain relevant information, provide general helpful information
- Focus on police procedures, incident analysis, and evidence interpretation
- Be professional and accurate in your responses
- Cite specific details from the reports when available
- If no context is available, still provide helpful information about police report analysis`

    // Prepare messages for Nova Sonic
    const novaMessages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...messages.slice(-5) // Keep last 5 messages for context
    ]

    // Prepare the request payload for Titan model
    const prompt = novaMessages.map(msg => 
      `${msg.role === 'system' ? 'System' : msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
    ).join('\n\n') + '\n\nAssistant:'

    const requestBody = {
      inputText: prompt,
      textGenerationConfig: {
        maxTokenCount: 1000,
        temperature: 0.7,
        topP: 0.9
      }
    }

    console.log('📤 Sending request to Nova Sonic...')

    const command = new InvokeModelCommand({
      modelId: process.env.NOVA_MODEL_ID || 'amazon.titan-text-express-v1', // Using Titan for testing
      body: JSON.stringify(requestBody),
      contentType: 'application/json'
    })

    const response = await bedrockClient.send(command)
    
    if (!response.body) {
      throw new Error('No response body received from Nova Sonic')
    }

    // Parse the response
    const responseText = new TextDecoder().decode(response.body)
    const responseData = JSON.parse(responseText)
    
    console.log('✅ Titan response received')

    return NextResponse.json({
      success: true,
      content: responseData.results?.[0]?.outputText || 'No response generated',
      sources: context.length > 0 ? ['popopal-outputs S3 bucket'] : [],
      confidence: 0.8,
      contextUsed: context.length > 0
    })

  } catch (error) {
    console.error('❌ Nova Sonic API error:', error)
    
    // Fallback response
    return NextResponse.json({
      success: false,
      content: `I apologize, but I'm having trouble processing your request right now. Please try again in a moment.`,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
