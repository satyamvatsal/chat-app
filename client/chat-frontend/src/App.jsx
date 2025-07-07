import React, { useEffect, useState } from "react";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import ChatBox from "./components/ChatBox";
import { ToastContainer, Flip } from "react-toastify";
import useWebSocketWithReconnect from "./components/UseWebSocketWithAutoReconnect";
import { getPrivateKey, savePrivateKey, getMessages, deleteChat } from "./db";
import { useRef } from "react";

const PrivateKeyModal = ({ isOpen, onClose, onSave }) => {
  const [privateKey, setPrivateKey] = useState("");
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const fetchKey = async () => {
        const username = localStorage.getItem("username");
        const savedKey = await getPrivateKey(username);
        if (savedKey) {
          setPrivateKey(savedKey);
        }
      };
      fetchKey();
    }
  }, [isOpen]);
  if (!isOpen) return null;
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(privateKey);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-fade-in"
      >
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4">
          <h2 className="text-xl font-bold text-white">Set Your Private Key</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Private Key
            </label>
            <textarea
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="Enter your private key"
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              This key will be stored securely in your browser's localStorage.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-lg shadow transition"
            >
              Save Key
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

function App() {
  const [token, setToken] = useState(null);
  const menuRef = useRef(null);
  const [username, setUsername] = useState("");
  const [receiver, setReceiver] = useState("");
  const [newReceiver, setNewReceiver] = useState("");
  const [showLogin, setShowLogin] = useState(true);
  const [recentChats, setRecentChats] = useState([]);
  const [logs, setLogs] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);

  const { ws, typingUsers } = useWebSocketWithReconnect({
    token,
    username,
    receiver,
    setLogs,
    setReceiver,
    setRecentChats,
  });
  useEffect(() => {
    const savedToken = localStorage.getItem("authToken");
    const savedUsername = localStorage.getItem("username");
    setToken(savedToken);
    setUsername(savedUsername);
  }, []);

  useEffect(() => {
    const fetchRecentChats = async () => {
      if (!username) return;
      const messages = await getMessages(username);
      const chatMap = new Map();

      for (let msg of messages) {
        let other = msg.from === username ? msg.to : msg.from;
        if (
          !chatMap.has(other) ||
          chatMap.get(other).timestamp < msg.timestamp
        ) {
          chatMap.set(other, msg);
        }
      }

      const chats = Array.from(chatMap.entries())
        .map(([user, msg]) => ({
          user,
          lastMessage: msg.text,
          timestamp: msg.timestamp,
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      setRecentChats(chats);
    };

    fetchRecentChats();
  }, [username]);

  const handleDeleteChat = async (chatUser) => {
    await deleteChat(chatUser, username);
    setRecentChats((prev) => prev.filter((chat) => chat.user !== chatUser));
  };
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleShowPrivateKey = async () => {
    const privateKey = await getPrivateKey(username);
    window.prompt("Your Private Key (Copy and store securely):", privateKey);
    setMenuOpen(false);
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setToken(null);
    setUsername("");
  };

  const handleSavePrivateKey = async (key) => {
    await savePrivateKey(username, key);
    setShowPrivateKeyModal(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-sm">
          <h1 className="text-2xl font-semibold text-center mb-4">
            {showLogin ? "Login to Chat" : "Create an Account"}
          </h1>

          {showLogin ? (
            <LoginForm setToken={setToken} setUsername={setUsername} />
          ) : (
            <RegisterForm setToken={setToken} setUsername={setUsername} />
          )}

          <div className="text-center mt-4">
            <button
              className="text-gray-800 hover:underline text-sm"
              onClick={() => setShowLogin(!showLogin)}
            >
              {showLogin
                ? "Don't have an account? Register"
                : "Already registered? Login"}
            </button>
          </div>
        </div>
        <ToastContainer
          position="top-center"
          autoClose={2500}
          hideProgressBar
          newestOnTop
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
          transition={Flip}
        />
      </div>
    );
  }

  if (!receiver) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6 space-y-4">
          <div className="flex justify-between items-center p-4 border-b shrink-0">
            <div className="flex items-center gap-2 text-xl font-bold">
              <img
                src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${username}`}
                alt="avatar"
                className="w-12 h-12 rounded-full"
              />
              {username + " "} (You)
            </div>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="text-gray-600 hover:text-gray-900 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 16 16"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="#000000"
                >
                  <path
                    strokeWidth={1}
                    d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"
                  />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
                  <button
                    onClick={logout}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    logout
                  </button>
                  <button
                    onClick={handleShowPrivateKey}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    show private key
                  </button>
                  <button
                    onClick={() => {
                      setShowPrivateKeyModal(true);
                    }}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    set private key
                  </button>
                  <PrivateKeyModal
                    isOpen={showPrivateKeyModal}
                    onClose={() => setShowPrivateKeyModal(false)}
                    onSave={handleSavePrivateKey}
                  />
                </div>
              )}
            </div>
          </div>
          <h1 className="text-xl font-bold mb-2">recent chats</h1>
          <ul className="divide-y divide-gray-200">
            {recentChats.map((chat, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between py-3 hover:bg-gray-50"
              >
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setReceiver(chat.user)}
                >
                  <img
                    src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${chat.user}`}
                    alt="avatar"
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-medium">{chat.user}</p>
                    <p className="text-sm text-gray-500 truncate max-w-[200px]">
                      {chat.lastMessage}
                    </p>
                  </div>
                </div>
                <button
                  className="text-red-500 hover:text-red-700 text-xl px-2"
                  onClick={() => handleDeleteChat(chat.user)}
                  title="Delete Chat"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>

          <div className="pt-4 border-t">
            <h2 className="text-md font-medium mb-2">start chat</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newReceiver}
                onChange={(e) => setNewReceiver(e.target.value)}
                placeholder="Enter username"
                className="flex-1 border px-3 py-2 rounded text-sm"
              />
              <button
                onClick={() => {
                  if (newReceiver.trim()) setReceiver(newReceiver.trim());
                }}
                className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded text-sm"
              >
                chat
              </button>
            </div>

            {Notification.permission !== "granted" && (
              <button
                className="mt-5 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
                onClick={() => {
                  if ("Notification" in window) {
                    Notification.requestPermission().then((perm) => {
                      console.log("Permission:", perm);
                    });
                  }
                }}
              >
                Enable Notifications
              </button>
            )}
          </div>
        </div>

        <ToastContainer
          position="top-center"
          autoClose={2500}
          hideProgressBar
          newestOnTop
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
          transition={Flip}
        />
      </div>
    );
  }

  return (
    <ChatBox
      setUsername={setUsername}
      receiver={receiver}
      setReceiver={setReceiver}
      setToken={setToken}
      ws={ws}
      username={username}
      logs={logs}
      setLogs={setLogs}
      isTyping={
        typingUsers[receiver] && Date.now() - typingUsers[receiver] < 2000
      }
    />
  );
}

export default App;
