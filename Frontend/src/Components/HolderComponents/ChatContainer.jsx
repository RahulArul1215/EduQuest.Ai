import React, { useEffect, useRef } from "react";
import "../../Styles/HolderComponents/ChatContainer.css";

export const ChatContainer = ({ messages }) => {
  
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="Chat-Container" ref={containerRef}>
      
      {messages.map((msg, index) => {

        const showSeparator =
          msg.sender === "user" && index > 0;

        return (
          <div key={index}>

            {showSeparator && <hr className="user-start-separator" />}

            {/* user prompt */}
            {msg.sender === "user" && (
              <div className="chat-user">
                <div className="user-text glass-user">{msg.text}</div>
              </div>
            )}

            {/* Ai response */}
            {msg.sender === "ai" && (
              <div className="chat-ai">
                <div
                  className="ai-text marksman"
                  dangerouslySetInnerHTML={{ __html: msg.text }}
                />
              </div>
            )}

          </div>
        );
      })}

    </div>
  );
};
