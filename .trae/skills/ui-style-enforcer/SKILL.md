---
name: ui-style-enforcer
description: "# ui-style-enforcer
When proposing UI components or CSS, enforce iOS-like tokens:
- font-family: SF Pro / -apple-system
- rounded corners 12–18px
- subtle shadow: 0 6px 16px rgba(0,0,0,0.12)
- glass cards: backdrop-filter: blur(8px); background: rgba(255,255,255,0.7)
- motion: durations 200–360ms; easing cubic-bezier(.22,1,.36,1)
- accent color: #0A84FF; success: #34C759; danger: #FF3B30
- large title (34px) for header, body   // карточка
<motion.div initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} transition={{duration:0.32, ease:[0.22,1,0.36,1]}} className=\"card\">...</motion.div>

// hover для баров
<motion.rect whileHover={{scale:1.02}} transition={{duration:0.12}} .../>"
---

# ui-style-enforcer
When proposing UI components or CSS, enforce iOS-like tokens:
- font-family: SF Pro / -apple-system
- rounded corners 12–18px
- subtle shadow: 0 6px 16px rgba(0,0,0,0.12)
- glass cards: backdrop-filter: blur(8px); background: rgba(255,255,255,0.7)
- motion: durations 200–360ms; easing cubic-bezier(.22,1,.36,1)
- accent color: #0A84FF; success: #34C759; danger: #FF3B30
- large title (34px) for header, body 16px