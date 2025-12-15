const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
// const API_BASE_URL = process.env.REACT_APP_API_URL || "https://zpc8hwxd-8000.inc1.devtunnels.ms";

export const API_ENDPOINTS = {
  // authentication
  SIGNUP: `${API_BASE_URL}/adduser`,
  LOGIN: `${API_BASE_URL}/login`,

  // userdata
  GET_USER_DATA: (userId) => `${API_BASE_URL}/user_full_data/${userId}`,

  // chats
  CREATE_CHAT: `${API_BASE_URL}/create_chat`,
  ASK: `${API_BASE_URL}/ask`,
  REMOVE_CHAT_DOCUMENT: `${API_BASE_URL}/remove_chat_document`,
  SEARCH_CHATS: (userId) => `${API_BASE_URL}/search_chats/${userId}`,

  // doucment
  UPLOAD_DOCUMENT: (userId) => `${API_BASE_URL}/upload_document?user_id=${userId}`,
  PROCESS_DOCUMENT: (documentId) => `${API_BASE_URL}/process_document/${documentId}`,

  // quiz
  GENERATE_QUIZ: `${API_BASE_URL}/generate_quiz`,
  VALIDATE_QUIZ: `${API_BASE_URL}/validate_quiz`,
};

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
};

export default API_ENDPOINTS;
