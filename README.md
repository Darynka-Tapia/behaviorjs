# behaviorjs

**behaviorjs** is an experimental **UX Analytics** library designed to measure user intent and friction through real-time interaction analysis.

Analyze your session data at: [behaviorjs Dashboard](https://behaviorjs.netlify.app/)

---

### 🎯 Project Objectives
* **Temporal Metrics:** Advanced breakdown of **Visual Discovery** (search time) vs. **Cognitive Hesitation** (decision time).
* **Affordance Audit:** Automated analysis of CSS styles (cursors, shadows, borders) to evaluate the "clickability" of UI elements.
* **Inactivity Filtering:** Precision tracking of **Real Active Time**, strictly excluding idle periods and tab switching.

### 📊 Data Capture
The system automatically monitors elements marked with the `data-behavior` attribute and records:

- **Detailed TTA (Time to Action):** Reaction times, element ID, and interaction context.
- **Miss-clicks:** Identification of failed clicks outside interaction zones or on non-functional elements.
- **Scroll Tracking:** Reading milestones (25%, 50%, 75%, 100%) to measure content engagement.

---

## 📦 Installation

```bash
npm install @tapyka/behaviorjs
```

## 🚀 Quick Start
Initialize the tracker in your main entry point (e.g., `main.js`, `App.vue`, or an `Astro <script>`):

```
import { initBehavior } from '@tapyka/behaviorjs';

window.addEventListener('load', () => {
  initBehavior({
    targets: ['cta', 'nav-link'], // Matches data-behavior="cta"
    debug: true,
    providers: {
      discord: 'YOUR_DISCORD_WEBHOOK_URL'
    }
  });
});
```

## 🛠 How to Monitor Elements
To enable advanced tracking on specific components, add the `data-behavior` attribute to your HTML:
```
<button data-behavior="cta">
  Get Started
</button>

<a href="#" data-behavior="nav-link">
  Documentation
</a>
```

## 📑 JSON Session Report
At the end of each session, behaviorjs generates a structured JSON report compatible with the [behaviorjs dashboard](https://behaviorjs.netlify.app/), providing a complete timeline of the user's behavioral journey.

## ⚠️ Current Status: Beta
This is an __experimental project__ focused on HCI research. While functional, it is currently in a beta stage. Features and API structures are subject to change as we refine our behavioral data models.

## 🤝 Contributions & Feedback
This is an early beta version currently in the testing phase. If you find any bugs, have suggestions for improvement, or want to contribute to the HCI data models, feel free to open an issue or submit a pull request. Your feedback is highly appreciated!

---
_Active Development - April 2026_