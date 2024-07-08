import React, { useState } from 'react';

const Chatbot = () => {
  const [chatMessage, setChatMessage] = useState('');
  const [chatResponse, setChatResponse] = useState('');
   
  const handleGeminiChat = async () => {
    try {
      const response = await fetch('http://localhost:3000/gemini-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: chatMessage }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to get response from Gemini');
      }
  
      const data = await response.json();
      setChatResponse(data.response);
    } catch (error) {
      console.error('Error in Gemini chat:', error);
      setChatResponse('Failed to get response from Gemini');
    }
  };

  return (
    <div className="bg-[#1C1C1C] rounded-lg w-full p-6 mt-8">
      <h2 className="text-xl mb-4 text-gray-300">Cognizant Chat</h2>
      <textarea
        value={chatMessage}
        onChange={(e) => setChatMessage(e.target.value)}
        placeholder="Enter your query..."
        className="bg-[#282828] text-white rounded-lg py-4 px-4 w-full mb-4 focus:outline-none"
        rows="4"
      />
      <button
        onClick={handleGeminiChat}
        className="bg-[#A8C5DA] hover:bg-black hover:text-white text-black py-3 px-6 rounded-lg transition duration-300"
      >
        Send 
      </button>
      {chatResponse && (
        <div className="mt-4 bg-[#282828] text-white rounded-lg p-4">
          <h3 className="text-lg mb-2">Response:</h3>
          <p>{chatResponse}</p>
        </div>
      )}
    </div>
  );
};

export default Chatbot;