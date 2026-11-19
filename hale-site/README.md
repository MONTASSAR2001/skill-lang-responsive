# nextjs-clone-starter

Next.js (App Router, `src/`) + Tailwind CSS v4 + GSAP/ScrollTrigger + Framer Motion + React Three Fiber/drei.

```bash
npm install
npm run dev      # http://localhost:3000, the URL compare_visual_diff uses as localUrl
```

| Path | Purpose |
|---|---|
| `src/app/globals.css` | Paste extracted CSS variables, `@font-face`, `@keyframes` here |
| `src/app/page.tsx` | The cloned sections, in page order |
| `src/lib/gsap.ts` | One-time plugin registration + `registerEase()` for extracted cubic-beziers |
| `src/components/Reveal.tsx` | Framer Motion scroll reveal driven by measured values |
| `src/components/useScrollTrigger.ts` | Scoped GSAP/ScrollTrigger hook with cleanup |
| `src/components/CloneCanvas.tsx` | SSR-safe R3F `<Canvas>` wrapper |
| `public/fonts`, `public/assets`, `public/models` | Downloaded fonts, images, `.glb` files |
