import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  maxAttempts: 3,
  requestHandler: {
    requestTimeout: 10000,
  }
})

export async function POST(request: NextRequest) {
  try {
    const { reportUrl } = await request.json()

    if (!reportUrl) {
      return NextResponse.json({ error: 'No report URL provided' }, { status: 400 })
    }

    console.log(`📥 API: Downloading report from: ${reportUrl}`)

    // Parse the S3 URL to get bucket and key
    const url = new URL(reportUrl)
    const bucket = url.hostname.split('.')[0]
    const key = url.pathname.substring(1) // Remove leading slash

    console.log(`📁 API: Bucket: ${bucket}, Key: ${key}`)

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    const response = await s3Client.send(command)

    if (!response.Body) {
      throw new Error('Report body is empty')
    }

    // Convert the stream to buffer
    const chunks: Uint8Array[] = []
    const stream = response.Body as any
    
    for await (const chunk of stream) {
      chunks.push(chunk)
    }
    
    const buffer = Buffer.concat(chunks)
    const content = buffer.toString('utf-8')

    console.log(`✅ API: Successfully downloaded report (${buffer.length} bytes)`)

    return NextResponse.json({
      success: true,
      content,
      fileName: key.split('/').pop() || 'report.txt',
      size: buffer.length
    })

  } catch (error) {
    console.error('❌ API: Error downloading report:', error)
    return NextResponse.json(
      { error: `Failed to download report: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
