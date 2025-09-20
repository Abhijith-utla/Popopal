// Amplify configuration and initialization
import { Amplify } from 'aws-amplify'
import { amplifyConfig, awsCredentials, validateCredentials } from './amplify-config'

// Validate credentials first
validateCredentials()

// Configure Amplify with our settings
const config = {
  ...amplifyConfig,
  Auth: {
    Cognito: {
      // Add Cognito config if needed later
    }
  }
}

Amplify.configure(config)

export { Amplify }
