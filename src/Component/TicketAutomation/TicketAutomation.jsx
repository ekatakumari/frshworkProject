import "./TicketAutomation.css";
import { useState } from "react";

export const TicketAutomation = () => {
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [ticketsPerDay, setTicketsPerDay] = useState("");
  const [loading, setLoading] = useState(false);
  const [automationRunning, setAutomationRunning] = useState(false);

  // Start ticket automation
  const handleStart = async () => {
    setLoading(true);
    try {
console.log("Requesting ticket automation start with data:", {
        url,
        apiKey,
        ticketsPerDay,
      }); // Debug log
      const response = await fetch("http://localhost:5000/api/create-tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, apiKey, ticketsPerDay }),
      });
      const result = await response.json();
console.log("Server response:", result); // Debug log
            alert(result.message);
if (response.ok) setAutomationRunning(true);
    } catch (error) {
console.error("Error starting automation:", error);
      alert("Error starting automation.");
    }
    setLoading(false);
  };

  // Stop ticket automation
  const handleStop = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/stop-automation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      const result = await response.json();
      alert(result.message);
if (response.ok) setAutomationRunning(false);
    } catch (error) {
console.error("Error stopping automation:", error);
      alert("Error stopping automation.");
    }
  };

  return (
    <div className="container">
      <h2 className="heading">Freshdesk Ticket Setup</h2>
      <div className="input-field">
        <input
          className="input-label"
          placeholder="Freshdesk URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <input
          className="input-label"
          placeholder="API Key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <input
          className="input-label"
          placeholder="Tickets per day"
          type="number"
          value={ticketsPerDay}
          onChange={(e) => setTicketsPerDay(e.target.value)}
        />

        <button className="button" onClick={handleStart} disabled={loading || automationRunning}>
          {loading ? "Processing..." : "Start Automation"}
        </button>

        {automationRunning && (
          <button className="button stop-button" onClick={handleStop}>
            Stop Automation
          </button>
        )}
      </div>
    </div>
  );
};
