import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

registerSW({
  onNeedRefresh() {
    console.log('MeshNet: New content available, please refresh.');
  },
  onOfflineReady() {
    console.log('MeshNet: Offline cache ready. This app will now work without WiFi.');
  },
  onRegistered(r) {
    console.log('MeshNet: Service Worker registered successfully.');
  },
  onRegisterError(error) {
    console.error('MeshNet: Service Worker registration failed:', error);
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
