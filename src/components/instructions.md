# Product Requirements Document (PRD)

## 1. Project Overview

### Description
This project is an intelligent chat application designed to help users query UAE tax documentation, including laws, ministerial decisions, and other related legal documents. The system leverages advanced natural language processing using OpenAI’s API and vector search via Pinecone to deliver accurate and contextually relevant responses. In addition to real-time chat responses, the application features a persistent chat history stored in a PostgreSQL database (hosted on Railway), along with a sidebar for easy retrieval and review of previous conversations—mirroring the ChatGPT UI experience.

### Key Flow
1. **User Authentication & Session Initialization:**  
   - Users log in via a secure endpoint.
   - User credentials are verified, and session data is managed.
2. **Conversation Retrieval:**  
   - Upon login, the application fetches the user's previous conversation history from the PostgreSQL database.
   - A sidebar displays past chats, allowing users to select and resume conversations.
3. **User Query Submission:**  
   - Users submit queries via the chat interface.
4. **Processing & Embedding:**  
   - The backend processes the query, generates embeddings using OpenAI’s API, and sends them to Pinecone.
5. **Vector Search & Document Retrieval:**  
   - The system retrieves the most relevant tax documentation from Pinecone based on the query embeddings.
6. **Response Generation & SSE Streaming:**  
   - Retrieved context is combined with conversation history and the new query.
   - OpenAI’s API generates a response, streamed back to the client in real time.
7. **Chat History Update:**  
   - Each new message (both user and assistant) is stored in the PostgreSQL database to update the conversation history.

### Tech Stack
- **Frontend:**  
  - **React:** For building a dynamic and responsive UI.
  - **Tailwind CSS:** For rapid styling and responsive design.
  - **Shadcn UI:** For pre-designed, customizable UI components.
- **Backend:**  
  - **Node.js (Express):** For handling API requests and server-side logic.
  - **PostgreSQL:** For persisting user data and conversation history.
  - **Railway:** For hosting the backend server and PostgreSQL database.
- **Data & Search:**  
  - **Pinecone:** For managing and querying vector embeddings of the tax documents.
- **APIs:**  
  - **OpenAI API:** For generating embeddings and chat responses.

---

## 2. Core Functionalities

### 2.1. Chat Interface & Sidebar for Conversation History
- **Real-time Messaging:**  
  - Interactive and responsive chat UI supporting live streaming responses.
- **Conversation Sidebar:**  
  - Displays a list of past conversations retrieved from the PostgreSQL database.
  - Users can click on a conversation to view the history or resume the chat.
- **Responsive & Accessible Design:**  
  - UI built with Shadcn UI and Tailwind CSS ensuring a seamless experience across devices.

### 2.2. Query Processing & Embedding
- **User Input Handling:**  
  - Capture and validate user queries.
- **Embedding Generation:**  
  - Convert user queries into embeddings using OpenAI’s API.
- **Robust Error Handling:**  
  - Inform users of issues in case of technical errors or unsupported queries.

### 2.3. Vector Search & Document Retrieval
- **Pinecone Integration:**  
  - Use generated embeddings to query Pinecone.
  - Retrieve the top relevant documents and metadata (including text and source).
- **Context Aggregation:**  
  - Compile and format retrieved documents to provide context for generating responses.

### 2.4. Response Generation
- **Contextual Augmentation:**  
  - Merge conversation history and retrieved document context with the current query.
- **OpenAI Chat API:**  
  - Stream responses using SSE (Server-Sent Events) to deliver content in real time.
- **Response Formatting:**  
  - Ensure that responses are well-formatted (markdown supported) for readability.

### 2.5. Chat History & User Management
- **Persistent Conversation Storage:**  
  - Store each conversation (user messages and assistant responses) in a PostgreSQL database.
- **History Retrieval & Sidebar Integration:**  
  - On user login, fetch and display previous chats in a sidebar.
  - Allow users to click on a conversation to reload its history and continue the discussion.
- **Authentication & Session Management:**  
  - Implement secure login endpoints using a basic username/password mechanism.
  - Ensure safe handling of user sessions and data.

### 2.6. Additional Improvements & Robustness
- **CORS & Error Handling:**  
  - Fine-tuned CORS configuration to allow secure cross-origin requests.
  - Comprehensive logging and error handling for debugging and maintenance.
- **Health Check Endpoints:**  
  - Provide endpoints to monitor system status and diagnose issues.
- **Streaming & SSE Enhancements:**  
  - Maintain a smooth SSE stream to deliver real-time content updates to the user interface.

---

## 3. Documentation

### 3.1. Developer Documentation
- **Setup Instructions:**  
  - Detailed steps to clone the repository, install dependencies, and configure environment variables (including OpenAI, Pinecone, PostgreSQL, and Railway credentials).
- **Architecture Overview:**  
  - Diagrams and flowcharts illustrating the interaction between the frontend, Node.js backend, PostgreSQL database, Pinecone, and OpenAI API.
- **API Endpoints:**  
  - Documentation for each endpoint (e.g., `/api/chat`, `/api/login`, `/api/health`), including request/response formats, authentication details, and error codes.
- **Codebase Guidelines:**  
  - Best practices for code styling, commit messages, and contributing guidelines.

### 3.2. User Documentation
- **User Guide:**  
  - Instructions on using the chat interface, including sending queries, interpreting responses, and utilizing the conversation history sidebar.
- **Tutorials & Walkthroughs:**  
  - Interactive demos or video tutorials showcasing key features, including starting a new chat and resuming past conversations.
- **FAQ & Troubleshooting:**  
  - A section addressing common issues and steps to resolve them.

### 3.3. Deployment & Maintenance
- **Deployment Guide:**  
  - Instructions on deploying the Node.js server and PostgreSQL database on Railway.
  - Steps for setting up CI/CD pipelines if applicable.
- **Maintenance Procedures:**  
  - Regular tasks for updating tax documentation, monitoring API usage, and maintaining database health.
- **Security Considerations:**  
  - Guidelines on securing API keys, user data, and ensuring compliance with relevant data protection regulations.

### 4. Project Structure
- **Guidelines:**
Project structure must maintin minimal and less confusing organization to mainaitn the code easy; Proposed version is below:

Below is an updated project structure that separates concerns such as UI components, login pages, and protected routes. This approach helps with scalability and ease of maintenance while still keeping the structure minimal:

project-root/
├── chat-backend/
│   ├── node_modules/
│   ├── package-lock.json
│   ├── package.json
│   ├── processDocuments.cjs
│   └── server.mjs         // Contains Express routes (chat, auth, history) and PostgreSQL integration
├── netlify.toml           // Deployment configuration for Netlify (if needed)
├── railway.json           // Deployment configuration for Railway (including PostgreSQL settings)
└── tax-chat-frontend/
    ├── node_modules/
    ├── package-lock.json
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── public/
    └── src/
        ├── index.jsx      // Application entry point; bootstraps the React app
        ├── App.jsx        // Main component; sets up routing and global layout
        ├── pages/
        │   ├── Home.jsx           // Landing page or public info
        │   ├── Login.jsx          // Login page for user authentication
        │   └── Chat.jsx           // Main chat page with chat window and sidebar
        └── components/
            ├── ChatWindow.jsx     // Chat UI component for message display and input
            ├── Sidebar.jsx        // Sidebar component displaying conversation history
            ├── ProtectedRoute.jsx // Wrapper for routes that require authentication
            └── Header.jsx         // (Optional) Shared header/navigation component

