import './styles/tokens.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import FormControlPopovers from './components/common/FormControlPopovers.jsx';
import './styles/global.css';
import './styles/shell.css';
import './styles/patterns.css';
import './styles/lists.css';
import './styles/evidence.css';
import './styles/roomDetailLayout.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <FormControlPopovers />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
