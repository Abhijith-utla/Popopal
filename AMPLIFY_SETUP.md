# AWS Amplify S3 Setup Guide

## What Amplify Simplifies

✅ **No Manual AWS Configuration** - Amplify handles S3 bucket creation, IAM roles, and CORS
✅ **Built-in Progress Tracking** - Real upload progress with multipart uploads
✅ **Error Handling** - Comprehensive error management
✅ **Security** - Proper credential management
✅ **File Management** - Upload, download, delete operations

## Quick Setup Steps

### 1. Create S3 Bucket (One-time setup)

You need to create an S3 bucket manually in AWS Console:

1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com/)
2. Click "Create bucket"
3. Name: `popopal-video-uploads` (or your preferred name)
4. Region: `us-east-1` (or your preferred region)
5. Uncheck "Block all public access" (for video uploads)
6. Click "Create bucket"

### 2. Configure CORS (Required for web uploads)

In your S3 bucket, go to Permissions → CORS and add:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
        "ExposeHeaders": ["ETag"]
    }
]
```

### 3. Set up AWS Credentials

Create a `.env.local` file in your project root:

```env
# S3 Bucket Configuration
NEXT_PUBLIC_S3_BUCKET_NAME=popopal-video-uploads
NEXT_PUBLIC_AWS_REGION=us-east-1

# AWS Credentials (for development)
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

### 4. Update Bucket Name

Edit `lib/amplify-config.ts` and update the bucket name:

```typescript
export const amplifyConfig = {
  Storage: {
    AWSS3: {
      bucket: 'your-actual-bucket-name', // Update this
      region: 'us-east-1', // Update if different
    }
  }
}
```

## How It Works

1. **Upload Process**: Files are uploaded directly to S3 using Amplify's `uploadData` function
2. **Progress Tracking**: Real-time upload progress with multipart uploads for large files
3. **File Management**: Videos are stored with timestamps and organized in folders
4. **Error Handling**: Comprehensive error handling for network issues and permissions

## Features Included

- ✅ Real S3 uploads (no more mock data)
- ✅ Progress tracking with file names
- ✅ Multipart uploads for large files
- ✅ Error handling and retry logic
- ✅ File listing and deletion
- ✅ TypeScript support
- ✅ Video format validation

## Testing

1. Start your development server: `npm run dev`
2. Go to the upload page
3. Drag and drop video files
4. Watch real upload progress to S3!

## Next Steps

- Add authentication with AWS Cognito (optional)
- Integrate with AWS Rekognition for video analysis
- Add video preview functionality
- Implement user management

## Troubleshooting

**Upload fails**: Check your AWS credentials and bucket permissions
**CORS errors**: Ensure CORS is properly configured in S3
**Large file issues**: Multipart uploads are handled automatically
