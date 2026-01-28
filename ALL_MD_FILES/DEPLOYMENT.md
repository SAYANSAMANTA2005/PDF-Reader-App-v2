# Deployment Guide

This guide explains how to deploy the PDF Reader App to Render.com.

## Option 1: Zero Config Deployment (Using render.yaml)

This repository includes a `render.yaml` Blueprint specification.

1.  **Push to GitHub**: Ensure your latest code is pushed to your GitHub repository.
2.  **Go to Render Dashboard**: Log in to [dashboard.render.com](https://dashboard.render.com/).
3.  **New Blueprint**: Click **New +** -> **Blueprint**.
4.  **Connect Repo**: Select your `pdf-reader-app` repository.
5.  **Deploy**: Render will automatically detect the configuration in `render.yaml` and deploy your static site.

## Option 2: Manual Setup

If you prefer to configure it manually:

1.  **Go to Render Dashboard**: Log in to [dashboard.render.com](https://dashboard.render.com/).
2.  **New Static Site**: Click **New +** -> **Static Site**.
3.  **Connect Repo**: Select your `pdf-reader-app` repository.
4.  **Configure Settings**:
    - **Name**: `pdf-reader-app`
    - **Branch**: `main`
    - **Build Command**: `npm run build`
    - **Publish Directory**: `dist`
5.  **Create Static Site**: Click the button to start the deployment.

Render will build your application and deploy the contents of the `dist` folder.
