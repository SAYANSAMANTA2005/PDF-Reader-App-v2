# Local Run Instructions

Follow these steps to run the PDF Reader App on your local machine.

## Prerequisites

- **Node.js**: Ensure Node.js (version 16 or higher) is installed.
- **npm**: Generally comes installed with Node.js.

## Installation

1.  **Clone the repository** (if you haven't already):
    ```bash
    git clone <YOUR_REPO_URL>
    cd pdf-reader-app
    ```

2.  **Install Dependencies**:
    Run the following command in the project root to install all required packages:
    ```bash
    npm install
    ```

## Running the Application

1.  **Start the Development Server**:
    ```bash
    npm run dev
    ```

2.  **Open in Browser**:
    The terminal will show a local URL (usually `http://localhost:5173/` or similar). Open this link in your web browser.

## Building for Production

To create a production-ready build:
```bash
npm run build
```
To preview the production build locally:
```bash
npm run preview
```
