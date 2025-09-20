import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// Initialize S3 client once (reuse connection)
const s3Client = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  // Optimize connection settings
  maxAttempts: 3,
  requestHandler: {
    requestTimeout: 10000, // 10 second timeout
  }
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Parse form data more efficiently
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log(`🚀 Fast upload starting for: ${file.name} (${file.size} bytes)`)

    // Generate key for bucket root (no folder) so Lambda triggers
    const timestamp = Date.now() // Use timestamp instead of ISO string
    const key = `${timestamp}-${file.name}`

    // Convert to buffer efficiently (S3 needs this for hash calculation)
    const fileBuffer = await file.arrayBuffer()
    
    const command = new PutObjectCommand({
      Bucket: 'popopal-video-input',
      Key: key,
      Body: new Uint8Array(fileBuffer),
      ContentType: file.type,
      // Minimal metadata for speed
      Metadata: {
        name: file.name,
        size: file.size.toString()
      }
    })

    // Upload to S3 with optimized settings
    const result = await s3Client.send(command)
    
    const duration = Date.now() - startTime
    console.log(`✅ Fast upload completed in ${duration}ms for: ${file.name}`)

    return NextResponse.json({
      success: true,
      key: key,
      url: `https://popopal-video-input.s3.us-east-1.amazonaws.com/${key}`,
      bucket: 'popopal-video-input',
      region: 'us-east-1',
      duration: duration
    })

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`❌ Upload failed after ${duration}ms:`, error)
    return NextResponse.json(
      { error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
