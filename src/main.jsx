import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';
import './styles/mobile.css';
import { PDFProvider } from './context/PDFContext.jsx';

// Use PDFProvider for all features including the high-performance system
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <PDFProvider>
            <App />
        </PDFProvider>
    </React.StrictMode>,
);

// Register Service Worker (only in production)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('✅ Service Worker registered: ', registration);
            })
            .catch(registrationError => {
                console.warn('⚠️ Service Worker registration failed: ', registrationError);
            });
    });
} else {
    console.log('ℹ️ Service Worker registration skipped (dev mode or not supported)');
}
