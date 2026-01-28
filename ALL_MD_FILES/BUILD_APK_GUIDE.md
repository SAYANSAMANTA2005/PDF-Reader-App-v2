# 📱 How to Build Your PDF Reader APK

## ✅ Android Studio is Now Open!

I've opened your Android project in Android Studio. Since Java is not configured in your command line, we'll build the APK directly in Android Studio (which has its own JDK).

---

## 🚀 Build APK in Android Studio - Step by Step

### **Option 1: Build Debug APK (Fastest - No Signing Required)**

1. **Wait for Gradle Sync to Complete**
   - Look at the bottom of Android Studio
   - Wait for "Gradle sync finished" message (may take 2-5 minutes first time)

2. **Build the APK**
   - Click **Build** menu → **Build Bundle(s) / APK(s)** → **Build APK(s)**
   - OR use keyboard shortcut: **Ctrl+Shift+A** → type "Build APK" → Enter

3. **Wait for Build**
   - Progress bar will show at the bottom
   - Takes 2-5 minutes for first build

4. **Locate Your APK**
   - When done, you'll see a notification: "APK(s) generated successfully"
   - Click **locate** in the notification
   - OR manually go to: `android\app\build\outputs\apk\debug\app-debug.apk`

5. **Install on Device**
   - Transfer `app-debug.apk` to your Android phone
   - Open the APK file on your phone
   - Allow "Install from Unknown Sources" if prompted
   - Tap Install

---

### **Option 2: Build Release APK (For Distribution - Requires Signing)**

> [!WARNING]
> Release APKs must be signed. If you don't have a keystore, use Debug APK instead.

1. **Create Keystore (First Time Only)**
   - Click **Build** → **Generate Signed Bundle / APK**
   - Select **APK** → Click **Next**
   - Click **Create new...** under Key store path
   - Fill in:
     - **Key store path**: Choose location (e.g., `C:\Users\sayan\pdf-reader-keystore.jks`)
     - **Password**: Create a strong password (SAVE THIS!)
     - **Alias**: `pdf-reader-key`
     - **Validity**: 25 years
     - Fill in certificate info (any values work)
   - Click **OK**

2. **Sign and Build**
   - Enter your keystore password
   - Select **release** build variant
   - Click **Finish**

3. **Locate Release APK**
   - Found at: `android\app\build\outputs\apk\release\app-release.apk`

---

## 🔧 Alternative: Build via Command Line (After Java Setup)

If you want to build via command line in the future:

### **1. Install Java JDK**
- Download: [Oracle JDK 17](https://www.oracle.com/java/technologies/downloads/#java17) or [OpenJDK 17](https://adoptium.net/)
- Install and add to PATH

### **2. Set JAVA_HOME**
```powershell
# In PowerShell (as Administrator)
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Java\jdk-17", "Machine")
```

### **3. Build APK**
```bash
cd android
.\gradlew assembleDebug    # Debug APK
.\gradlew assembleRelease  # Release APK (needs signing)
```

---

## 📍 APK Locations

After building, your APKs will be at:

**Debug APK** (unsigned, for testing):
```
f:\JU SUPER FOLDER\JU (SEM)\math 2\PDF Reader App - Copy\android\app\build\outputs\apk\debug\app-debug.apk
```

**Release APK** (signed, for distribution):
```
f:\JU SUPER FOLDER\JU (SEM)\math 2\PDF Reader App - Copy\android\app\build\outputs\apk\release\app-release.apk
```

---

## 🎯 Quick Actions in Android Studio

| Action | Menu Path | Shortcut |
|--------|-----------|----------|
| Build APK | Build → Build Bundle(s) / APK(s) → Build APK(s) | - |
| Generate Signed APK | Build → Generate Signed Bundle / APK | - |
| Run on Device | Run → Run 'app' | Shift+F10 |
| Clean Build | Build → Clean Project | - |
| Rebuild | Build → Rebuild Project | - |

---

## ✅ What to Do Right Now

1. **In Android Studio**: Wait for Gradle sync to finish (bottom status bar)
2. **Then**: Click **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. **Wait**: 2-5 minutes for build to complete
4. **Click**: "locate" in the success notification
5. **Transfer**: `app-debug.apk` to your Android phone
6. **Install**: Open the APK on your phone and install

---

## 🐛 Troubleshooting

### **Gradle Sync Failed**
- Click **File** → **Invalidate Caches / Restart**
- Wait for Android Studio to restart and sync again

### **Build Failed**
- Check the **Build** tab at the bottom for errors
- Common fix: Click **Build** → **Clean Project** → then build again

### **"Install Blocked" on Phone**
- Go to phone Settings → Security → Enable "Install from Unknown Sources"
- Or Settings → Apps → Special Access → Install Unknown Apps → Enable for your file manager

### **APK Not Found**
- Check: `android\app\build\outputs\apk\debug\`
- If empty, build may have failed - check Build tab for errors

---

## 📊 Build Info

**App Name**: PDF Reader Pro  
**Package**: com.pdfreader.pro  
**Min Android**: 5.1 (API 22)  
**Target Android**: Latest  
**APK Size**: ~15-20 MB (estimated)

---

## 🎉 Next Steps After Building

1. **Test the APK** on your Android device
2. **Share with friends** for beta testing
3. **Publish to Google Play Store** (requires signed release APK)
4. **Update app icon** in `android\app\src\main\res\mipmap-*\`

---

**Current Status**: ✅ Android Studio is open and ready to build!

**Action Required**: Follow "Option 1: Build Debug APK" steps above in Android Studio.
