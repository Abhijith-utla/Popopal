import { NextRequest, NextResponse } from 'next/server'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

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
    const { inputS3Key, uploadTime } = await request.json()

    if (!inputS3Key) {
      return NextResponse.json({ error: 'No input S3 key provided' }, { status: 400 })
    }

    console.log(`🔍 API: Checking for ANY new files after upload time`)
    console.log(`📁 Input S3 Key: ${inputS3Key}`)
    console.log(`⏰ Upload Time: ${uploadTime}`)

    // Extract upload timestamp from input key (first part before dash)
    const uploadTimestamp = parseInt(inputS3Key.split('-')[0])
    const uploadTimeMs = uploadTime || uploadTimestamp

    console.log(`📅 Looking for files newer than: ${new Date(uploadTimeMs).toISOString()}`)

    // Get ALL files from the bucket (no prefix filter)
    const command = new ListObjectsV2Command({
      Bucket: 'popopal-outputs',
      MaxKeys: 100 // Get more files to check
    })

    const response = await s3Client.send(command)
    console.log(`📊 API: Found ${response.Contents?.length || 0} total objects in output bucket`)

    if (response.Contents && response.Contents.length > 0) {
      console.log(`📋 API: All files in bucket:`)
      response.Contents.forEach((obj, index) => {
        console.log(`  ${index + 1}. ${obj.Key} (Modified: ${obj.LastModified})`)
      })
      
      // Find files newer than upload time
      const newFiles = response.Contents.filter(obj => 
        obj.LastModified && obj.LastModified.getTime() > uploadTimeMs
      )
      
      console.log(`🆕 API: Found ${newFiles.length} files newer than upload time`)
      
      if (newFiles.length > 0) {
        // Sort by modification time (newest first)
        const latestFile = newFiles.sort((a, b) => 
          (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0)
        )[0]

        if (latestFile && latestFile.Key) {
          const reportUrl = `https://popopal-outputs.s3.us-east-1.amazonaws.com/${latestFile.Key}`
          
          console.log(`✅ API: Found new file: ${latestFile.Key}`)
          console.log(`🔗 API: Report URL: ${reportUrl}`)
          console.log(`📅 File modified: ${latestFile.LastModified}`)
          
          return NextResponse.json({
            success: true,
            found: true,
            reportUrl,
            fileName: latestFile.Key.split('/').pop() || 'Report',
            lastModified: latestFile.LastModified,
            allNewFiles: newFiles.map(obj => ({
              key: obj.Key,
              url: `https://popopal-outputs.s3.us-east-1.amazonaws.com/${obj.Key}`,
              lastModified: obj.LastModified
            }))
          })
        }
      } else {
        console.log(`❌ API: No files found newer than upload time`)
      }
    } else {
      console.log(`❌ API: No files found in bucket`)
    }

    return NextResponse.json({
      success: true,
      found: false,
      message: 'No new files found after upload time',
      uploadTime: uploadTimeMs,
      totalFiles: response.Contents?.length || 0
    })

  } catch (error) {
    console.error('❌ API: Error checking reports:', error)
    return NextResponse.json(
      { error: `Failed to check reports: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
