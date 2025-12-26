# CampusFind 🔍🎓

> **Lost something on campus? Don't panic.**  
> _AI-powered tracking. Instant community alerts. Trusted verification._

**CampusFind** is the modern solution to the "Lost & Found" chaos.  
Instead of scrolling through hundreds of spammy WhatsApp messages, just snap a photo.  
Our **AI (GPT-4o)** identifies the item, matching "Lost" reports with "Found" items instantly.  
Plus, with **Trust Scores** and **Push Notifications**, we make returning items rewarding and safe.

---

## 🌟 Key Features

### 🧠 AI-Powered Intelligence

- **Auto-Tagging**: Upload an image, and our AI (GPT-4o Mini) instantly identifies the category, color, brand, and distinctive features. No more manual data entry.
- **Smart Matching**: The "Flagship Feature". Advanced vision algorithms compare visual and textual features to automatically match Lost items with Found candidates.

### 🔒 Secure Verification Flow

1. **Claim Request**: Users claim an item they believe is theirs.
2. **Founder Review**: The finder reviews the claim and accepts it.
3. **QR Handover**: A unique 6-digit QR code is generated. The item is only "Resolved" when the finder scans the owner's code at the meetup.

### 📊 Data-Driven Insights

- **Live Dashboard**: Google Charts visualize campus hotspots and resolution rates.
- **Trust Score**: Gamified leaderboard rewards honest finders with reputation points.

### 📱 Modern User Experience

- **PWA-Ready**: Mobile-first design with a fixed bottom navigation bar.
- **Push Notifications**: Receive instant alerts (via FCM) when your item is claimed or matched.
- **Google Auth**: Seamless one-tap sign-in for students.

---

## 🛠️ Technology Stack

| Component      | Tech                                                     |
| -------------- | -------------------------------------------------------- |
| **Frontend**   | React, Vite, Tailwind CSS, Framer Motion                 |
| **Backend**    | Python Flask, SQLAlchemy                                 |
| **Database**   | SQLite (Dev) / Postgres (Prod - Neon)                    |
| **AI Engine**  | OpenAI GPT-4o Mini                                       |
| **Auth & Ops** | Firebase Auth (Google Sign-In), Firebase Cloud Messaging |
| **Analytics**  | Google Analytics 4, Google Charts                        |

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Python (v3.9+)
- OpenAI API Key (for GPT-4o Vision)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/campusfind.git
cd campusfind
```

### 2. Backend Setup

```bash
cd server
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Configure Environment:**
Create `server/.env`:

```env
SECRET_KEY=your_secret_key
OPENAI_API_KEY=sk-your-openai-key
FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json
FIREBASE_STORAGE_BUCKET=your-app.appspot.com

# Optional: Defaults to local SQLite (campusfind.db) if not set
# DATABASE_URL=postgresql://user:pass@localhost/dbname
```

**Run Backend:**

```bash
python3 app.py
# Server runs on http://localhost:5001
```

### 3. Frontend Setup

```bash
cd ../client
npm install
```

**Configure Environment:**
Create `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:5001/api
VITE_GA_MEASUREMENT_ID=G-XXXXXX
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_FIREBASE_VAPID_KEY=your_vapid_key
```

**Run Frontend:**

```bash
npm run dev
# App runs on http://localhost:5173
```

### 📱 Testing on Mobile (Network)

`localhost` only works on your own computer. To test on your phone (same Wi-Fi):

1.  **Find your Laptop's IP**:
    - Mac: `ipconfig getifaddr en0` (usually `192.168.x.x`)
    - Windows: `ipconfig`
2.  **Update `client/.env`**:
    ```env
    # Replace 'localhost' with your IP
    VITE_API_BASE_URL=http://192.168.1.5:5001/api
    ```
3.  **Run with Host Flag**:
    ```bash
    npm run dev -- --host
    ```
4.  **Open on Phone**: Visit `http://192.168.1.5:5173`

---

## 📱 Screenshots

| Dashboard         | Upload with AI     | Mobile Nav    |
| ----------------- | ------------------ | ------------- |
| _Clean interface_ | _Auto-filled tags_ | _Easy access_ |

---

## 🤝 Contributing

This project was built for the **GDG Hackathon 2025**.  
Contributions are welcome! If you have an idea to make CampusFind better:

1.  **Fork the Project** (Go to top right -> Fork)
2.  **Clone it** (`git clone ...`)
3.  **Build your Feature** (`git checkout -b feature/NewCoolFeature`)
4.  **Commit the Code** (`git commit -m 'Added cool chart'`)
5.  **Push to Branch** (`git push origin feature/NewCoolFeature`)
6.  **Open a Pull Request**!

---

## 📄 License

Distributed under the MIT License.  
Made with ❤️ by the **CampusFind Team**.
