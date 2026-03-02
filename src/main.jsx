import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Storage polyfill using localStorage for standalone deployment
if (!window.storage) {
  window.storage = {
    async get(key) {
      try {
        const val = localStorage.getItem(`nw_${key}`);
        if (val === null) throw new Error("not found");
        return { key, value: val };
      } catch (e) { throw e; }
    },
    async set(key, value) {
      localStorage.setItem(`nw_${key}`, value);
      return { key, value };
    },
    async delete(key) {
      localStorage.removeItem(`nw_${key}`);
      return { key, deleted: true };
    },
    async list(prefix = "") {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith(`nw_${prefix}`)) keys.push(k.replace("nw_", ""));
      }
      return { keys };
    },
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
