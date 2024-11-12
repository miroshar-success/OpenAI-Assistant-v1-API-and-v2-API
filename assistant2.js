const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendMessageToAssistant(userInput, sessionId) {
  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    "OpenAI-Beta": "assistants=v2",
    'Content-Type': 'application/json'
  };
  // sessionId = userSessions[sessionId];

  try {
    // Create a new thread
    const createThreadUrl = "https://api.openai.com/v1/threads";
    const resp = await axios.post(createThreadUrl, {}, {headers});
    const threadId = resp.data.id;

    // Add message to the thread
    const createMessageUrl = `https://api.openai.com/v1/threads/${threadId}/messages`;
    const messageResponse = await axios.post(createMessageUrl, {
      role: "user",
      content: userInput
    }, { headers });

    // Run thread
    const runsURL = `https://api.openai.com/v1/threads/${threadId}/runs`;
    const runResponse = await axios.post(runsURL, {
      assistant_id: assistantId,
      instructions:"Mustn't use any general knowledge. Must Only respond based on the files or vector data provided.",
      temperature: 0.1,
      top_p: 0.9
    }, { headers });
    const runId = runResponse.data.id;

    // Retrieve run
    const retrieveRun = `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`;

    while((await axios.get(retrieveRun, { headers })).data.status != "completed") {
      await sleep(1000);
    }

    // List messages
    const listMessageUrl = `https://api.openai.com/v1/threads/${threadId}/messages`;
    const listMessageResponse = await axios.get(listMessageUrl, {headers});

    // Get Response
    const assistantMessage = listMessageResponse.data.data.find(message => message.role === 'assistant');
    if (assistantMessage && assistantMessage.content[0].text) {
      console.log(`Last assistant message: ${assistantMessage.content[0].text.value}`);
      return assistantMessage.content[0].text.value;
    } else {
      console.log('No assistant message found.');
    }
   
  } catch (error) {
    console.error("Error:", error);
    return `Error occurred: ${error.message || error}`;
  }
}

app.post('/send-message', async (req, res) => {
  const userInput = req.body.messages || "what is age restriction?";
  const sessionId = req.body.threadId || uuidv4();

  const assistantResponse = await sendMessageToAssistant(userInput, sessionId);
  res.json({ message: assistantResponse });
});

app.get('/', (req, res) => {
  res.send("Backend API is live");
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
