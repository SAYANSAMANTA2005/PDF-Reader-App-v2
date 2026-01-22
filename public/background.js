// Open the PDF Reader in a new tab when the extension icon is clicked
chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({
        url: chrome.runtime.getURL('index.html')
    });
});

// Handle installation and context menu creation
chrome.runtime.onInstalled.addListener(() => {
    console.log('PDF Reader Pro Extension installed');

    // Create context menu for PDF links
    chrome.contextMenus.create({
        id: "open-pdf-reader",
        title: "Open in PDF Reader Pro",
        contexts: ["link"]
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "open-pdf-reader") {
        const url = info.linkUrl;
        // Check if it's likely a PDF
        if (url.toLowerCase().includes('.pdf') || url.includes('drive.google.com')) {
            chrome.tabs.create({
                url: chrome.runtime.getURL(`index.html?file=${encodeURIComponent(url)}`)
            });
        } else {
            // Just open the app if it's not a clear PDF link
            chrome.tabs.create({
                url: chrome.runtime.getURL('index.html')
            });
        }
    }
});
