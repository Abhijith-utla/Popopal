# S3 CORS Configuration

Your S3 bucket needs CORS configuration to allow uploads from the browser. Here's how to fix it:

## Step 1: Go to AWS S3 Console
1. Go to https://s3.console.aws.amazon.com/
2. Find your bucket: `popopal-video-input`
3. Click on the bucket name

## Step 2: Configure CORS
1. Go to the **Permissions** tab
2. Scroll down to **Cross-origin resource sharing (CORS)**
3. Click **Edit**
4. Replace the existing configuration with this:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedOrigins": [
            "http://localhost:3000",
            "http://localhost:3001", 
            "http://localhost:3002",
            "http://localhost:3003",
            "https://yourdomain.com"
        ],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```

5. Click **Save changes**

## Step 3: Test Again
After configuring CORS, try uploading again. The upload should work!

## Common CORS Errors:
- `Access to fetch at 'https://s3.amazonaws.com/...' from origin 'http://localhost:3003' has been blocked by CORS policy`
- `No 'Access-Control-Allow-Origin' header is present on the requested resource`

If you see these errors, the CORS configuration above will fix them.
