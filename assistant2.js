const express = require("express");
const cors = require("cors");
const axios = require('axios');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
const userConversation = [];
async function sendMessageToAssistant(userInput, sessionId) {

  let threadId;
  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    "OpenAI-Beta": "assistants=v2",
    'Content-Type': 'application/json'
  };

  try {
    if (userConversation[sessionId]) {
      threadId = userConversation[sessionId];
    } else {
       // Create a new thread
      const createThreadUrl = "https://api.openai.com/v1/threads";
      const resp = await axios.post(createThreadUrl, {}, {headers});
      threadId = resp.data.id;
console.log(threadId);
      userConversation[sessionId] = threadId;
    }
   
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

async function getHistoryMessage(threadId) {
  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    "OpenAI-Beta": "assistants=v2",
    'Content-Type': 'application/json'
  };

  try {
    // List messages
    const listMessageUrl = `https://api.openai.com/v1/threads/${threadId}/messages`;
    const listMessageResponse = await axios.get(listMessageUrl, { headers });
  
    if (listMessageResponse == null || !listMessageResponse.data || !listMessageResponse.data.data) {
      console.log("No messages found");
      return [];
    }
  
    // Filter messages where role is "assistant"
    const assistantMessages = listMessageResponse.data.data.filter(message => message.role === 'assistant');
  
    if (assistantMessages.length > 0) {
      let historyMessageArray = [];
      
      // Loop through all assistant messages
      assistantMessages.forEach((message, index) => {
        if (message.content && message.content.length > 0) {
          
          // Loop through all content items in each message
          message.content.forEach((contentItem, contentIndex) => {
            
            const formattedMessage = {
              role: "assistant",
              content: contentItem.text.value
            };
    
            historyMessageArray.push(formattedMessage);
            console.log(`Assistant message: ${index}-${contentIndex}: ${formattedMessage.content}`);
          });
        }
      });
    
      return historyMessageArray; // Return the array of formatted assistant message objects
    }
    else {
      console.log('No assistant messages found.');
      return [];
    }
  } catch (error) {
    console.error("Error:", error.message || error);
    return `Error occurred: ${error.message || error}`;
  }
  
}

app.post('/send-message', async (req, res) => {
  const userInput = req.body.messages;
  const sessionId = req.body.threadId;
  const assistantResponse = await sendMessageToAssistant(userInput, sessionId);
  res.json({ message: assistantResponse });
});

app.post('/read-messageHistory', async (req, res) => {
  const threadId = req.body.threadId;
  const assistantResponse = await getHistoryMessage(threadId);
  res.json({ message: assistantResponse });
});

app.get('/', (req, res) => {
  res.send("Backend API is live");
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
