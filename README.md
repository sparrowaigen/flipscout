# FlipScout

**Built by Jamie M Jovel**

Live: [https://flipscout-4bm8.vercel.app](https://flipscout-4bm8.vercel.app)

A mobile tool for thrift and garage-sale flipping.

Take a photo in the aisle. Get a quick-flip price (sell it fast) and a patient-flip price (wait for more), then tap Buy / Maybe / Skip. Everything is logged so you can look back later.

---

### The problem

Standing in a thrift store or garage sale with limited time and mental bandwidth. You need a fast call on whether something is worth buying to flip, without pulling out your phone and doing a full research rabbit hole.

### What I built

A mobile-first web app. Take 1–4 photos, optionally add a note, and get two price suggestions: a quick-flip price (sell it soon) and a patient-flip price (hold for more). Then tap Buy, Maybe, or Skip. Everything is logged locally so you can look back later.

### How the AI is used

Photos are sent to a vision model that identifies the item, notes condition and brand if visible, and returns structured price estimates plus a suggested verdict. The numbers are starting points, not final answers.

### One decision I made

I kept the interface deliberately simple and aisle-friendly. No accounts, no shipping logic, no marketplace posting. Just the decision loop I actually needed while thrifting with my fiancé.

### Honest limit

The AI estimates can be wrong. Local sold comps, real condition, and timing still matter more than any model output. The app is a decision aid, not a guarantee.

---

Jamie M Jovel · Built with help from Grok.
