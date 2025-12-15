import React, { useContext, useState } from 'react';
import '../../Styles/HolderComponents/Sidebar.css';
import logo from '../../Resources/logo-main.png';
import slideIcon from '../../Resources/sidebar.png';
import newchat from '../../Resources/chat-bubble.png';
import search from '../../Resources/search.png';
import quizicon from '../../Resources/brain.png'
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../Context/UserContext';
import API_ENDPOINTS from '../../config/apiConfig';

export const Sidebar = ({ collapsed, setCollapsed, resetHolder, setActiveChatId, onSelectChat }) => {
  
  const navigate = useNavigate();
  const { userData } = useContext(UserContext);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const chats = userData?.chats || [];

  const handlenewpage = () => {
    resetHolder();
    setActiveChatId(null);
    navigate('/holder');
  };

  const toggleSidebar = () => setCollapsed(!collapsed);

  // 🔍 SEARCH CHATS API
  const searchChats = async (keyword) => {
    setSearchKeyword(keyword);

    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }

    const res = await fetch(
      `${API_ENDPOINTS.SEARCH_CHATS(userData?.user.user_id)}?q=${keyword}`
    );

    const data = await res.json();
    if (data.status) {
      setSearchResults(data.results);
    }
  };

  const openChatFromSearch = (id) => {
    onSelectChat(id);
    setSearchOpen(false);
  };

  return (
    <>
      {/* popup */}
      {searchOpen && (
        <div className="Sidebar-search-popup-overlay" onClick={() => setSearchOpen(false)}>
          <div className="Sidebar-search-popup" onClick={(e) => e.stopPropagation()}>
            <div className='Sidebar-search-popup-heading'>Search keyword</div>
            <input
              type="text"
              placeholder="Search ..."
              className="Sidebar-search-popup-input"
              value={searchKeyword}
              onChange={(e) => searchChats(e.target.value)}
            />
            <div className='Sidebar-search-popup-hrline'></div>
            <div className="Sidebar-search-popup-list">
              {searchResults.length === 0 && (
                <div className="Sidebar-search-popup-empty">No results</div>
              )}

              {searchResults.map((c) => (
                <div
                  key={c.chat_id}
                  className="Sidebar-search-popup-item"
                  onClick={() => openChatFromSearch(c.chat_id)}
                >
                  {c.title}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* sidebar */}
      <div className={collapsed ? 'Sidebar-Container collapsed' : 'Sidebar-Container'}>

        {/* logo + slide button */}
        <div className='Sidebar-logo-slider-placer'>
          <img src={logo} className='Sidebar-Logo' onClick={!collapsed ? toggleSidebar : undefined} />
          <img src={slideIcon} className={collapsed ? 'slideIcon slideIcon-hidden' : 'slideIcon'} onClick={toggleSidebar} />
          {collapsed && <img src={slideIcon} className="slideIcon collapsed-logo-slide" onClick={toggleSidebar} />}
        </div>

        {/* buttons */}
        <div className='Sidebar-Buttons-Container'>

          <div className='NewChat-btn' onClick={handlenewpage}>
            <div className='NewChat-btn-icon-placer'><img src={newchat} className='Newchaticon' /></div>
            {!collapsed && <h2>New Chat</h2>}
          </div>

          <div className='NewChat-btn' onClick={() => navigate('/holder?mode=quiz')}>
            <div className='NewChat-btn-icon-placer'><img src={quizicon} className='Searchicon' /></div>
            {!collapsed && <h2>Generate Quiz</h2>}
          </div>

          <div className='NewChat-btn' onClick={() => setSearchOpen(true)}>
            <div className='NewChat-btn-icon-placer'><img src={search} className='Searchicon' /></div>
            {!collapsed && <h2>Search History</h2>}
          </div>
          

        </div>

        {/* history */}
        {!collapsed && (
          <div className='SideBar-History-Container'>
            <h2 className='SideBar-History-Container-h2'>History</h2>
            <div className='SideBar-History-Container-li'>
              {chats.map((chat) => (
                <li
                  key={chat.chat_id}
                  onClick={() => onSelectChat(chat.chat_id)}
                  className="sidebar-chat-item"
                >
                  {chat.title}
                </li>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
};
