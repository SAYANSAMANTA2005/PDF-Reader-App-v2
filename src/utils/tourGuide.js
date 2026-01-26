import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const startAppTour = () => {
    const driverObj = driver({
        showProgress: true,
        animate: true,
        steps: [
            {
                element: '.logo-area',
                popover: {
                    title: 'Welcome to PDF Reader Pro',
                    description: 'Your all-in-one AI-powered PDF workspace. Let\'s take a quick tour!',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '.sidebar-container',
                popover: {
                    title: 'Sidebar & Tools',
                    description: 'This is your command center. Access Thumbnails, AI Features, and Table of Contents here.',
                    side: "right",
                    align: 'start'
                }
            },
            {
                element: '.home-panel .tools-container',
                popover: {
                    title: 'Editing Tools',
                    description: 'Use the Home tab to Add Text, Images, Snip content, or split/merge PDFs.',
                    side: "right",
                    align: 'start'
                }
            },
            {
                element: '.viewer-scroll-container',
                popover: {
                    title: 'Smart Reader',
                    description: 'Read comfortably with fast scrolling. Double-click anywhere to add text notes instantly.',
                    side: "left",
                    align: 'start'
                }
            },
            {
                element: '.toolbar-container',
                popover: {
                    title: 'Top Toolbar',
                    description: 'Quickly access Zoom, Layout modes, and settings.',
                    side: "bottom",
                    align: 'end'
                }
            },
            {
                element: '[title="Ask AI"]',
                popover: {
                    title: 'AI Capabilities & Setup',
                    description: 'Click here to chat with your document. IMPORTANT: Go to "AI" tab settings to enter your Gemini API Key to unlock all smart features!',
                    side: "right",
                    align: 'start'
                }
            },
            {
                element: '.sidebar-tab:nth-child(14)', // Handwriting tab
                popover: {
                    title: 'Digitize Handwriting',
                    description: 'Convert handwritten notes into structured, searchable digital text using our advanced OCR engine.',
                    side: "right",
                    align: 'start'
                }
            },
            {
                element: '.sidebar-tab:nth-child(6)', // Graph/Nodes tab
                popover: {
                    title: 'Knowledge Graph',
                    description: 'Visualise connections between concepts in your PDF. Great for understanding complex topics.',
                    side: "right",
                    align: 'start'
                }
            },
            {
                element: '.toolbar-group:nth-child(3)', // Search bar area
                popover: {
                    title: 'Smart Search',
                    description: 'Find any word, phrase, or concept instantly. Results are highlighted for easy navigation.',
                    side: "bottom",
                    align: 'start'
                }
            }
        ]
    });

    driverObj.drive();
};
