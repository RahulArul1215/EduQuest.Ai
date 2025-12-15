import React, { useContext, useState, useEffect } from "react";
import "../Styles/Holder.css";
import { Sidebar } from "./HolderComponents/Sidebar";
import user from "../Resources/user.png";
import { WelcomeAni } from "./HolderComponents/WelcomeAni";
import HolderSearch from "./HolderComponents/HolderSearchBox";
import { ChatContainer } from "./HolderComponents/ChatContainer";
import QuizContainer from "./HolderComponents/QuizContainer";   // ✅ NEW
import { UserContext } from "./Context/UserContext";
import { useNavigate, useLocation } from "react-router-dom";

export const Holder = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [animateExit, setAnimateExit] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  const { userData } = useContext(UserContext);

  // CHAT STATE
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();

  // MODE → "chat" | "quiz"
  const [mode, setMode] = useState("chat");

  /** Detect mode from URL */
  useEffect(() => {
    const params = new URLSearchParams(location.search);

    if (params.get("mode") === "quiz") {
      setMode("quiz");
      setShowWelcome(false); // quiz should not show welcome
    } else {
      setMode("chat");
    }
  }, [location]);

  /** logout */
  const handleLogout = () => {
    navigate("/");
  };

  /** new chat reset */
  const resetHolder = () => {
    setShowWelcome(true);
    setAnimateExit(false);
    setMessages([]);
    setActiveChatId(null);
    setMode("chat"); // reset mode
  };

  /** when user selects chat */
  const handleChatSelect = (chat_id) => {
    setMode("chat"); // ensure chat mode
    setActiveChatId(chat_id);

    const chat = userData?.chats?.find((c) => c.chat_id === chat_id);

    if (chat) {
      setMessages(
        chat.messages.map((msg) => ({
          sender: msg.role === "user" ? "user" : "ai",
          text: msg.content,
        }))
      );
    }

    setShowWelcome(false);
  };

  /** when user sends msg */
  const handleSendClick = (userMessage, aiResponse) => {
    setAnimateExit(true);

    setTimeout(() => {
      setShowWelcome(false);

      setMessages((prev) => [
        ...prev,
        { sender: "user", text: userMessage },
        { sender: "ai", text: aiResponse },
      ]);
    }, 700);
  };

  return (
    <div className="HolderContainer">

      {/* left sidebar */}
      <div className="Holder-Sidebar-Container">
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          resetHolder={resetHolder}
          activeChatId={activeChatId}
          setActiveChatId={setActiveChatId}
          onSelectChat={handleChatSelect}
          setMode={setMode}  
        />
      </div>

      {/* Right container */}
      <div className="Holder-Content-Container">

        {/* top bar */}
        <div className="Holder-Content-Container-top-ele">
          <div className="HolderContainer-logo-name-flex-placer">
            <div className="HolderContainer-logo-name">EduQuest.ai</div>

            <div
              className="HolderContainer-User-Login"
              onClick={handleLogout}
              onMouseEnter={() => setShowLogout(true)}
              onMouseLeave={() => setShowLogout(false)}
            >
              <img src={user} className="holder-user-image" />

              <div className="holder-user-name">
                {showLogout ? "Logout" : userData?.user.full_name}
              </div>
            </div>
          </div>

          <div className="hrline"></div>
        </div>

        {/* welcome screen */}
        {showWelcome && mode === "chat" && (
          <div className={animateExit ? "welcome-exit-animation" : ""}>
            <WelcomeAni />
          </div>
        )}

        {/* chat or quiz */}
        {!showWelcome && (
          <>
            {mode === "chat" && (
              <ChatContainer
                activeChatId={activeChatId}
                messages={messages}
              />
            )}

            {mode === "quiz" && (
              <QuizContainer userData={userData} />
            )}
          </>
        )}

        {/* search bar only in chat mode and not in quiz */}
        {mode === "chat" && (
          <HolderSearch
            collapsed={collapsed}
            onSendClick={handleSendClick}
            activeChatId={activeChatId}
            setActiveChatId={setActiveChatId}
          />
        )}

      </div>
    </div>
  );
};
