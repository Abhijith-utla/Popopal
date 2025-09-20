// Amplify configuration for S3 video uploads
// This is a simplified setup that works without AWS CLI configuration

export const amplifyConfig = {
  Storage: {
    S3: {
      bucket: 'popopal-video-input', // Your existing S3 bucket
      region: 'us-east-1', // US East (N. Virginia)
    }
  }
}

// Alternative: Use environment variables for configuration
export const getAmplifyConfig = () => ({
  Storage: {
    S3: {
      bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME || 'popopal-video-input',
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    }
  }
})

// AWS Credentials configuration - uses environment variables only
export const awsCredentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'
}

// Validate credentials on startup
export const validateCredentials = () => {
  const accessKey = awsCredentials.accessKeyId
  const secretKey = awsCredentials.secretAccessKey
  
  console.log('🔍 Validating AWS credentials...')
  console.log('📍 Region:', awsCredentials.region)
  console.log('🔑 Access Key ID:', accessKey ? `${accessKey.substring(0, 8)}...` : 'Not set')
  console.log('🔐 Secret Access Key:', secretKey ? 'Set' : 'Not set')
  
  if (!accessKey || accessKey === '') {
    console.error('❌ AWS_ACCESS_KEY_ID is not set or invalid')
    console.error('💡 Make sure AWS_ACCESS_KEY_ID is set in .env.local')
    return false
  }
  
  if (!secretKey || secretKey === '') {
    console.error('❌ AWS_SECRET_ACCESS_KEY is not set or invalid')
    console.error('💡 Make sure AWS_SECRET_ACCESS_KEY is set in .env.local')
    return false
  }
  
  console.log('✅ AWS credentials validated successfully')
  return true
}