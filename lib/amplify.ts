// Amplify configuration and initialization
import { Amplify } from 'aws-amplify'
import { amplifyConfig, awsCredentials } from './amplify-config'

// Configure Amplify with our settings including credentials
const fullConfig = {
  ...amplifyConfig,
  Auth: {
    ...amplifyConfig.Auth,
    credentials: awsCredentials
  }
}

Amplify.configure(fullConfig)

export { Amplify }
