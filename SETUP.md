# Setup Guide for Utah Equipment

This site uses **Firebase** (free) for data + auth and **Cloudinary** (free) for image hosting. No credit card required for either.

---

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"**
3. Name it something like `utah-equipment`
4. Disable Google Analytics (optional, not needed)
5. Click **Create**

## 2. Enable Authentication

1. In Firebase Console, go to **Build > Authentication**
2. Click **Get Started**
3. Under **Sign-in method**, enable **Email/Password**
4. Go to the **Users** tab and click **Add user**
5. Enter your admin email and password (this is what you'll use to log into the admin panel)

## 3. Enable Firestore Database

1. Go to **Build > Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode**
4. Select a region close to you (e.g., `us-central1`)
5. Click **Enable**

### Set Firestore Security Rules

Go to **Firestore > Rules** and replace the default rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /listings/{listingId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

Click **Publish**.

## 4. Get Your Firebase Config

1. Go to **Project Settings** (gear icon at top-left)
2. Scroll down to **"Your apps"** section
3. Click the **Web** icon (`</>`) to add a web app
4. Name it `utah-equipment-web`
5. **Do NOT** check "Firebase Hosting"
6. Click **Register app**
7. Copy the `firebaseConfig` values shown

## 5. Set Up Cloudinary (Free Image Hosting)

1. Go to [cloudinary.com](https://cloudinary.com/) and create a free account
2. Once logged in, your **Cloud Name** is shown on the Dashboard (e.g., `dxyz1234`)
3. Go to **Settings > Upload**
4. Scroll to **Upload presets** and click **Add upload preset**
5. Set **Signing Mode** to **Unsigned**
6. Optionally set a folder name like `utah-equipment`
7. Click **Save**
8. Copy the **preset name** (e.g., `ml_default` or whatever you named it)

## 6. Add Config to Your Site

Open `js/firebase-config.js` and replace the placeholder values:

```js
export const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "utah-equipment.firebaseapp.com",
    projectId: "utah-equipment",
    storageBucket: "utah-equipment.firebasestorage.app",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};

export const cloudinaryConfig = {
    cloudName: "dxyz1234",           // Your cloud name from step 5.2
    uploadPreset: "ml_default"       // Your preset name from step 5.8
};
```

## 7. Deploy / Host for Free

### Option A: GitHub Pages (Simplest)

1. Push this repo to GitHub
2. Go to **Settings > Pages**
3. Under **Source**, select `master` branch, root folder
4. Click **Save**
5. Your site will be live at `https://yourusername.github.io/skidsteers/`

### Option B: Netlify (Drag & Drop)

1. Go to [netlify.com](https://www.netlify.com/)
2. Drag and drop this project folder onto the page
3. Done — instant deployment with free SSL

### Option C: Firebase Hosting

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Run `firebase login`
3. Run `firebase init hosting` in this project folder
4. Set public directory to `.` (current directory)
5. Say **No** to single-page app
6. Say **No** to overwriting index.html
7. Run `firebase deploy`

## 8. Using the Admin Panel

1. Go to `yoursite.com/admin.html`
2. Log in with the email/password you created in Step 2
3. Click **"+ Add New Listing"** to add equipment
4. Fill in the details, upload images, and save
5. The listing will immediately appear on the main site

## Free Tier Limits

**Firebase (no credit card needed):**
- Firestore: 1GB storage, 50K reads/day, 20K writes/day
- Auth: Unlimited users

**Cloudinary (no credit card needed):**
- 25 credits/month (~25GB storage or bandwidth)
- Automatic image optimization
- More than enough for hundreds of equipment photos

## Notes

- **Images**: Uploaded to Cloudinary. The first image becomes the cover photo on the card.
- **Categories**: Use "Equipment" for machines and "Attachment" for accessories. Visitors can filter by these.
- **Status**: Set to "Sold" to move a listing to the "Past Equipment" section on the main site.
