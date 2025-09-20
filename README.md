# POPOPAL: An AI-Powered Dashcam Assistant for First Responders

POPOPAL (Police Officer Personal AI Assistant) is a web application that helps first responders by using AI to automate and simplify critical tasks. The app allows police officers and supervisors to upload dashcam or bodycam footage, which is then processed to create an accurate, on-demand summary of the event.

---

## Technologies Used

### Frontend
* **React**
* **Tailwind CSS**

### Backend & Cloud Services
* **AWS Amplify**: For building, deploying, and hosting the web application.
* **AWS S3**: For scalable storage of video footage and reports.
* **AWS DynamoDB**: A NoSQL database for storing metadata and interaction logs.
* **AWS Lambda**: To run serverless functions that manage the AI analysis pipeline when a new video is uploaded.

### AWS AI/ML Services
* **AWS Transcribe**: Converts spoken audio from footage into text.
* **Amazon Comprehend**: Analyzes the text to extract key phrases, sentiment, and entities.
* **Amazon Polly**: Generates voice output for the AI assistant.
* **Other AWS Services**: The application is designed to be extensible, with future integrations planned for services like **Amazon Rekognition** for video analysis and a custom-built model for advanced conversational AI.

---

## Getting Started

To get a local copy of this project running, follow these steps.

### Prerequisites
* Node.js (v18.x or later)
* npm or yarn
* An AWS account with appropriate permissions

### Installation
1.  **Clone the repository**:
    `git clone https://github.com/your-username/popopal-app.git`
    `cd popopal-app`
2.  **Install the dependencies**:
    `npm install`
3.  **Configure AWS Amplify**:
    * If you haven't already, install the Amplify CLI:
        `npm install -g @aws-amplify/cli`
    * Configure the CLI with your AWS credentials:
        `amplify configure`
    * Initialize the project:
        `amplify init`

---

## Usage
1.  **Launch the app**:
    `npm start`
2.  **Upload footage**: On the main dashboard, use the dedicated upload section to select and upload your video.
3.  **View analysis**: A link to the generated report will appear on your dashboard once the video is processed.
4.  **Interact with the AI**: Use the voice assistant to ask questions about the incident, such as "What was the suspect's name?" or "What was the officer's initial observation?"
