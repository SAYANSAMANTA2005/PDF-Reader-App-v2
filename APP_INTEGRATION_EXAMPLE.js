// src/App.jsx - WITH PDF SAFETY GUARD INTEGRATION
// Example of how to integrate the PDF Safety Guard

import React, { useState } from 'react';
import { usePDF } from './context/PDFContext';
import { usePDFSafetyGuard } from './hooks/usePDFSafetyGuard';
import PDFWarningModal from './components/PDFWarningModal';
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';
import PDFViewer from './components/PDFViewer';
import { Upload, FileText } from 'lucide-react';
import './styles/pdfWarningModal.css';
import './styles/main.css';

const App = () => {
   const {
      pdfDocument,
      loadPDF,
      isSidebarOpen,
      isLoading: isContextLoading,
      error
   } = usePDF();

   const safetyGuard = usePDFSafetyGuard();
   const [selectedFile, setSelectedFile] = useState(null);
   const [isSafeMode, setIsSafeMode] = useState(false);

   /**
    * Handle file selection from input or drag-drop
    */
   const handlePDFSelected = async (file) => {
      setSelectedFile(file);

      // Run preflight check (non-blocking)
      const result = await safetyGuard.check(file);

      if (!result) return;

      switch (result.status) {
         case 'ALLOWED':
            // Safe to load normally
            await loadPDF(file);
            safetyGuard.reset();
            break;

         case 'BLOCKED':
            // Show warning modal with options (handled via showWarning state)
            break;

         case 'ERROR':
            alert(`Error checking PDF: ${result.error}`);
            safetyGuard.reset();
            break;

         case 'CANCELLED':
            safetyGuard.reset();
            break;

         default:
            break;
      }
   };

   /**
    * Handle user choosing to load in Safe Mode
    */
   const handleLoadInSafeMode = async () => {
      try {
         setIsSafeMode(true);
         await loadPDF(selectedFile, { safeMode: true });
         safetyGuard.setShowWarning(false);
      } catch (err) {
         alert(`Failed to load in Safe Mode: ${err.message}`);
      }
   };

   /**
    * Handle user choosing download only
    */
   const handleDownloadOnly = () => {
      if (selectedFile instanceof File) {
         const url = URL.createObjectURL(selectedFile);
         const a = document.createElement('a');
         a.href = url;
         a.download = selectedFile.name;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         URL.revokeObjectURL(url);
      }
      safetyGuard.reset();
   };

   /**
    * Handle user cancelling
    */
   const handleCancel = () => {
      safetyGuard.reset();
      setSelectedFile(null);
   };

   /**
    * Handle file input
    */
   const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (file && file.type === 'application/pdf') {
         handlePDFSelected(file);
      }
   };

   return (
      <div className="app-container">
         <div className="main-layout">
            <header className="header">
               <div className="logo-area">
                  <FileText className="logo-icon" />
                  <span className="logo-text">Elite PDF Reader</span>
               </div>
               <Toolbar />
            </header>

            <div className="content-area">
               {pdfDocument && isSidebarOpen && <Sidebar />}

               <main className="viewer-area">
                  {!pdfDocument && (
                     <div className="upload-container">
                        <div className="upload-box">
                           <Upload size={48} className="upload-icon" />
                           <h2>Open a PDF to start reading</h2>
                           <p>Drag and drop a file here, or click to select</p>

                           {safetyGuard.isChecking && (
                              <div className="checking-status" style={{ marginTop: '1rem', textAlign: 'center' }}>
                                 <p>⏳ Analyzing PDF: {safetyGuard.checkProgress}</p>
                                 <div style={{
                                    width: '100%',
                                    height: '4px',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: '2px',
                                    marginTop: '10px',
                                    overflow: 'hidden'
                                 }}>
                                    <div style={{
                                       width: '50%',
                                       height: '100%',
                                       background: 'var(--accent-color)',
                                       animation: 'pulse 1.5s infinite ease-in-out'
                                    }}></div>
                                 </div>
                              </div>
                           )}

                           <label className="upload-btn" style={{
                              marginTop: '1.5rem',
                              cursor: safetyGuard.isChecking ? 'not-allowed' : 'pointer',
                              opacity: safetyGuard.isChecking ? 0.6 : 1
                           }}>
                              {safetyGuard.isChecking ? 'Checking...' : 'Select PDF'}
                              <input
                                 type="file"
                                 accept="application/pdf"
                                 onChange={handleFileChange}
                                 hidden
                                 disabled={safetyGuard.isChecking}
                              />
                           </label>
                        </div>
                        {isContextLoading && <p className="loading-text">Loading into viewer...</p>}
                        {error && <p className="error-text">{error}</p>}
                     </div>
                  )}

                  {pdfDocument && <PDFViewer />}
               </main>
            </div>
         </div>

         {/* Safety Guard Warning Modal */}
         <PDFWarningModal
            isOpen={safetyGuard.showWarning}
            analysis={safetyGuard.preflightResult?.analysis}
            riskAssessment={safetyGuard.preflightResult?.riskAssessment}
            isLoading={safetyGuard.isChecking}
            onAllow={async () => {
               await loadPDF(selectedFile);
               safetyGuard.setShowWarning(false);
            }}
            onLoadSafeMode={handleLoadInSafeMode}
            onDownloadOnly={handleDownloadOnly}
            onCancel={handleCancel}
            memoryStatus={safetyGuard.memoryStatus}
         />
      </div>
   );
};

export default App;