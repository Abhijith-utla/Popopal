// Amplify configuration for S3 video uploads
// This is a simplified setup that works without AWS CLI configuration

export const amplifyConfig = {
  Storage: {
    AWSS3: {
      bucket: 'popopal-video-input', // Your existing S3 bucket
      region: 'us-east-1', // US East (N. Virginia)
    }
  },
  Auth: {
    // Optional: Add authentication later if needed
    Cognito: {
      userPoolId: 'us-east-1_XXXXXXXXX', // Add if using authentication
      userPoolClientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX', // Add if using authentication
    }
  }
}

// Alternative: Use environment variables for configuration
export const getAmplifyConfig = () => ({
  Storage: {
    AWSS3: {
      bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME || 'popopal-video-input',
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    }
  }
})

// AWS Credentials configuration
export const awsCredentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID 
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY 
  region: 'us-east-1'
}
