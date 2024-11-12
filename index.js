const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
// const userRoutes = require('./routes/userRoutes');
// const membershipRoutes = require('./routes/membershipRoutes');
// const documentsRoutes = require('./routes/documentRoutes');
// const chathistoryRoutes = require('./routes/chatHistoryRoutes');
// const FirebaseRoutes = require('./routes/FirebaseRoutes');
// const {connectToMongoDB} = require('./model/DB');
// const {listFiles} = require('./firebase/firebase');
const app = express();

// app.use(cors(corsOptions));
app.use(cors());
app.use(express.json());
// app.use('/users', userRoutes);
// app.use('/membership', membershipRoutes);
// app.use('/documents', documentsRoutes);
// app.use('/chat_history', chathistoryRoutes);
// app.use('/firebase', FirebaseRoutes);
// Connect to the database
// connectToMongoDB();
// listFiles();

const assistantId = 'asst_ItNNqhVEJOXkiODy0PlNGG6J';

const userConversation = [];

async function sendMessageToAssistant(userInput, sessionId) {
  let threadId;
  try {
    // Create a new thread for conversation
    if (userConversation[sessionId]) {
      threadId = userConversation[sessionId];
    } else {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      userConversation[sessionId] = threadId;
    }

    const message = await openai.beta.threads.messages.create(
      threadId,
      {
        role: "user",
        content: userInput
      }
    );

    let run  = await openai.beta.threads.runs.createAndPoll(
      threadId,
      {
        assistant_id: assistantId,
        // instructions:"Do not use any general knowledge. Only respond based on the files or vector data provided.",
        instructions:"Mustn't use any general knowledge. Must Only respond based on the files or vector data provided.",
        temperature: 0.2,  // Set the temperature
        top_p: 0.8  // Set the top_p
      }
    );
    const messages = await openai.beta.threads.messages.list(threadId, {
      run_id: run.id,
    });
    if(run.status === 'completed'){
      const assistantMessage = messages.data.reverse().find(message => message.role === 'assistant');
      if (assistantMessage && assistantMessage.content[0].text) {
        console.log(`Last assistant message: ${assistantMessage.content[0].text.value}`);
        return assistantMessage.content[0].text.value;
      } else {
        console.log('No assistant message found.');
      }
    } else {
      console.log(run.status);
    }
  } catch (error) {
    console.error('Error:', error);
    return `Error occurred while contacting assistant: ${error.message || error}`;
  }
}


app.post('/send-message', async (req, res) => {

  const userInput = req.body.messages || "what is age restriction?";
  const sessionId = req.body.threadId || "123e4567-e89b-12d3-a456-426614174000"; // Hardcoded threadId for testing

  
  // //validate sessionId
  // if(sessionId === ''){
  //   return res.status(400).json({success:1, message:`Can't find user`, data:''});
  // }
  
  const assistantResponse  = await sendMessageToAssistant(userInput, sessionId);
  res.json(assistantResponse);
});

app.get('/', (req, res) => {
  res.send("Hello. This is backend API");
})

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
