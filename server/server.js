const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cron = require("node-cron");
const mongoose = require("mongoose");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Store ongoing ticket automation tasks
const taskQueue = new Map();

// MongoDB connection
const MONGO_URI = "mongodb://localhost:27017/freshwork";
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("Error connecting to MongoDB:", error));

// Define a schema for tickets (optional)
const ticketSchema = new mongoose.Schema({
  email: String,
  subject: String,
  description: String,
  status: Number,
  priority: Number,
  source: Number,
  createdAt: { type: Date, default: Date.now },
});

// Create a model for tickets with the collection name 'freshwork'
const Ticket = mongoose.model("Ticket", ticketSchema, "tickets");

// Example: Save a ticket to the database
const saveTicketToDB = async (ticketData) => {
  try {
    console.log("Saving ticket to database:", ticketData); // Debug log
    const ticket = new Ticket(ticketData);
    await ticket.save();
    console.log("Ticket saved to database:", ticket);
  } catch (error) {
    console.error("Error saving ticket to database:", error);
  }
};

// Function to handle API rate limits
const handleRateLimit = async (response) => {
  const remaining = parseInt(response.headers["x-ratelimit-remaining"], 10);
  const retryAfter = parseInt(response.headers["retry-after"], 10);

  if (remaining === 0 && retryAfter) {
    console.warn(`Rate limit reached. Retrying after ${retryAfter} seconds...`);
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
  }
};


const addReplies = async (freshdeskUrl, apiKey, ticketId) => {
  console.log("Adding replies to ticket:", ticketId); // Debug log
  const replyUrl = `${freshdeskUrl}/api/v2/tickets/${ticketId}/reply`;

  const customerReply = {
    body: "Hello, I need help with an issue.",
    private: false,
  };

  const agentReply = {
    body: "Thank you for reaching out. We are working on it.",
    private: false,
  };

  try {
    // Add customer reply after 5 minutes
    setTimeout(async () => {
      try {
        const customerResponse = await axios.post(replyUrl, customerReply, {
          auth: { username: apiKey, password: "X" },
          headers: { "Content-Type": "application/json" },
        });
        await handleRateLimit(customerResponse);
        console.log(`Customer replied to ticket ${ticketId}`);

        // Save customer reply to the database
        await saveTicketToDB({
          email: `customer${Date.now()}@example.com`,
          subject: `Customer Reply for Ticket ${ticketId}`,
          description: customerReply.body,
          status: 2,
          priority: 1,
          source: 2,
          freshdeskId: ticketId,
        });
      } catch (error) {
        console.error("Error adding customer reply:", error.response?.data || error.message);
      }

      // Add agent reply after another 5 minutes
      setTimeout(async () => {
        try {
          const agentResponse = await axios.post(replyUrl, agentReply, {
            auth: { username: apiKey, password: "X" },
            headers: { "Content-Type": "application/json" },
          });
          await handleRateLimit(agentResponse);
          console.log(`Agent replied to ticket ${ticketId}`);

          // Save agent reply to the database
          await saveTicketToDB({
            email: `agent${Date.now()}@example.com`,
            subject: `Agent Reply for Ticket ${ticketId}`,
            description: agentReply.body,
            status: 2,
            priority: 1,
            source: 2,
            freshdeskId: ticketId,
          });
        } catch (error) {
          console.error("Error adding agent reply:", error.response?.data || error.message);
        }
      }, 5 * 60 * 1000);
    }, 5 * 60 * 1000);
  } catch (error) {
    console.error("Error adding replies:", error.response?.data || error.message);
  }
};

// Route to start ticket automation
app.post("/api/create-tickets", (req, res) => {
  const { url, apiKey, ticketsPerDay } = req.body;

  if (!url || !apiKey || !ticketsPerDay) {
    return res.status(400).json({ message: "Missing required parameters." });
  }

  // Check if a task is already running
  if (taskQueue.has(url)) {
    return res.status(400).json({ message: "Automation is already running for this Freshdesk instance." });
  }

  const cronExpression = `*/${Math.floor(1440 / ticketsPerDay)} * * * *`; // Spread tickets over the day
  const task = cron.schedule(cronExpression, async () => {
    const ticketData = {
      email: `user${Date.now()}@example.com`,
      subject: `Issue #${Date.now()}`,
      description: "This is a sample ticket.",
      status: 2,
      priority: 1,
      source: 2,
    };
   console.log(ticket)
    const ticket = await createTicket(url, apiKey, ticketData);
    if (ticket) {
      addReplies(url, apiKey, ticket.id);
    }
  });

  taskQueue.set(url, task);
  res.json({ message: "Ticket automation started successfully." });
});
const createTicket = async (freshdeskUrl, apiKey, ticketData) => {
    console.log("createticket",ticket)
    const url = `${freshdeskUrl}/api/v2/tickets`;
    try {
      console.log("Creating ticket with data:", ticketData); // Debug log
      const response = await axios.post(url, ticketData, {
        auth: {
          username: apiKey,
          password: "X",
        },
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log("Freshdesk API response:", response.data); // Debug log
  
      // Save the ticket to the database with the Freshdesk ticket ID
      const dbTicketData = {
        ...ticketData,
        freshdeskId: response.data.id, // Add Freshdesk ticket ID to the database entry
      };
      await saveTicketToDB(dbTicketData);
  
      return response.data;
    } catch (error) {
      console.error("Error creating ticket:", error.response?.data || error.message);
      return null;
    }
  };
// Route to stop automation
app.post("/api/stop-automation", (req, res) => {
  const { url } = req.body;

  if (taskQueue.has(url)) {
    taskQueue.get(url).stop();
    taskQueue.delete(url);
    return res.json({ message: "Ticket automation stopped." });
  }

  res.status(400).json({ message: "No automation running for this Freshdesk instance." });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
