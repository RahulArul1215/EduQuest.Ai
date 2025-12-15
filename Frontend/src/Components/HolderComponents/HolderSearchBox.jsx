import React, { useState, useEffect, useRef, useContext } from "react";
import "../../Styles/HolderComponents/HolderSearch.css";
import sendIcon from "../../Resources/plus.png";
import search from "../../Resources/search.png";
import send from "../../Resources/send.png";
import uploadicon from "../../Resources/cloud-computing.png";
import { UserContext } from "../Context/UserContext";
import voice from '../../Resources/voice.png'
import { toast } from "react-toastify";
import API_ENDPOINTS from "../../config/apiConfig";


const HolderSearch = ({ collapsed, activeChatId, setActiveChatId, onSendClick }) => {
  const { userData, fetchUserData } = useContext(UserContext);
  const user_id = userData?.user?.user_id;

  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const [voicePopup, setVoicePopup] = useState(null); //to show voice recording message


  const [activeDocument, setActiveDocument] = useState(null); // Shows uploaded file badge

  const fileInputRef = useRef(null);

  // file model
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
  };

  const handleBrowse = () => fileInputRef.current.click();

  const handleFileChange = (e) => validateAndSave(e.target.files[0]);

  const validateAndSave = (file) => {
    if (!file) return;
    const allowed = ["application/pdf", "text/plain", "image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.type)) {
      toast.error("Only PDF, Images, or Text files allowed.")
      return;
    }
    setSelectedFile(file);
  };

  //  draganddrop
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    validateAndSave(e.dataTransfer.files[0]);
  };

  //typing animation
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState("");

  useEffect(() => {
    const text = "Ask the Assistant...";
    let index = 0;

    const type = () => {
      setAnimatedPlaceholder(""); // reset
      index = 0;

      const interval = setInterval(() => {
        setAnimatedPlaceholder(text.slice(0, index + 1));
        index++;

        if (index === text.length) {
          clearInterval(interval);
          setTimeout(type, 2000);
        }
      }, 120);
    };

    type();
  }, []);




const startVoiceRecognition = () => {
  if (!("webkitSpeechRecognition" in window)) {
    toast.error("Voice recognition is not supported in this browser.");
    return;
  }

  const recognition = new window.webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  // Show popup
  setVoicePopup("Recording started...");

  recognition.start();

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    setQuery(transcript);

    // Change popup text
    setVoicePopup("Recorded!");

    // Hide after 1.5 seconds
    setTimeout(() => setVoicePopup(null), 1500);
  };

  recognition.onerror = () => {
    setVoicePopup("Recording failed");
    setTimeout(() => setVoicePopup(null), 1500);
  };

  recognition.onend = () => {
    // In case it ends without result callback
    if (voicePopup === "Recording started...") {
      setVoicePopup("Recorded!");
      setTimeout(() => setVoicePopup(null), 1500);
    }
  };
};


  // file uplaod process and create chat
  const uploadAndProcessFile = async () => {
    if (!selectedFile) return alert("Select a file first!");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      // upload
      const uploadRes = await fetch(API_ENDPOINTS.UPLOAD_DOCUMENT(user_id), {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.status) throw new Error("Upload failed");

      const documentId = uploadData.document_id;

      // process
      await fetch(API_ENDPOINTS.PROCESS_DOCUMENT(documentId), {
        method: "POST",
      });

      // create chat
      const createRes = await fetch(API_ENDPOINTS.CREATE_CHAT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id,
          document_id: documentId,
        }),
      });

      const chatData = await createRes.json();
      if (!chatData.status) throw new Error("Chat creation failed");

      //Set chat active
      setActiveChatId(chatData.chat_id);

      //Set document badge
      setActiveDocument({
        name: selectedFile.name,
        documentId: documentId,
      });

      //Refresh user data
      await fetchUserData(user_id);

      //Close modal instantly
      closeModal();

      //Alert
      toast.success("Upload successful — ready to chat!");

    } catch (err) {
      toast.error("Something went wrong: "+err.message)
    }

    setLoading(false);
  };

  // remove uploaded docs 

    const removeActiveDocument = async () => {
      if (!activeChatId) {
        setActiveDocument(null);
        return;
      }

      await fetch(API_ENDPOINTS.REMOVE_CHAT_DOCUMENT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: activeChatId }),
      });

      setActiveDocument(null);
      setActiveChatId(null); 
      toast.info("Chat deleted because document removed");

      await fetchUserData(user_id);
    };


  // send question
  const sendQuestion = async () => {
    if (!query.trim()) return;
    setLoading(true);

    let chat_id = activeChatId;

    // If first message → create new general chat
    if (!chat_id) {
      const chatRes = await fetch(API_ENDPOINTS.CREATE_CHAT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id,
          document_id: null,
          title: "New Chat",
        }),
      });

      const chatData = await chatRes.json();
      chat_id = chatData.chat_id;
      setActiveChatId(chat_id);
    }

    // Call /ask
    const askRes = await fetch(API_ENDPOINTS.ASK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id,
        user_id,
        question: query,
      }),
    });

    const askData = await askRes.json();
    onSendClick(query, askData.answer);
    setActiveDocument(null);   //Hide badge after sending question

    setQuery("");
    setLoading(false);

    await fetchUserData(user_id);
  };

  return (
    <>
      {/*Document Badge */}
      {activeDocument && (
        <div className="holder-search-doc-badge">
          <span className="holder-search-doc-name">{activeDocument.name}</span>
          <span className="holder-search-doc-remove" onClick={removeActiveDocument}>✕</span>
        </div>
      )}

      {/* Voice Recording popup */}
      {voicePopup && (
        <div className="voice-popup">
          {voicePopup}
        </div>
      )}


      {/* Search Bar */}
      
      <div
        className={`holder-search-container-placer ${collapsed ? "sidebar-collapsed" : "sidebar-open"}`}
        style={{ left: collapsed ? "32.5%" : "39.5%" }}
      >
        <div className="holder-search-container">
          <div className="holder-search-input-wrapper">
            {/* <img src={search} className="holder-search-icon" /> */}
            <button className="holder-search-send-btn" onClick={openModal}>
              <img className="holder-search-send-btn-img" src={sendIcon} />
            </button>
            <input
              type="text"
              className="holder-search-input-field"
              placeholder={animatedPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
            />



            <button className="holder-search-send-btn" onClick={startVoiceRecognition}>
              <img className="holder-search-voice-btn-img" src={voice} />
            </button>

            <button className="holder-search-send-btn" onClick={sendQuestion} disabled={loading}>
              <img className="holder-search-sendog-btn-img" src={send} />
            </button>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="Holder_search_upload_modal_overlay" onClick={closeModal}>
          <div
            className="Holder_search_upload_modal"
            style={{ marginLeft: collapsed ? "5%" : "18%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="Holder_search_upload_title">Upload File</div>

            <div
              className={`Holder_search_upload_box ${dragActive ? "drag-active" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="Holder_search_upload_icon">
                <img src={uploadicon} className="Model-Upload-Icon" />
              </div>

              {selectedFile ? (
                <div className="Holder_search_upload_file_name">{selectedFile.name}</div>
              ) : (
                <>
                  <div className="Holder_search_upload_text">Drag & Drop</div>
                  <div className="Holder_search_upload_or">or</div>
                </>
              )}

              <button className="Holder_search_upload_browse_btn" onClick={handleBrowse}>
                Browse Computer
              </button>

              <input
                type="file"
                accept=".pdf, .txt, .png, .jpg, .jpeg"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
            </div>

            {selectedFile && (
              <button
                className="Holder_search_upload_submit_btn"
                onClick={uploadAndProcessFile}
                disabled={loading}
              >
                {loading ? "Processing..." : "Upload & Process"}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default HolderSearch;
