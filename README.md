# ARTBOT Underworld (GitHub preview)

An experimental, interactive ARTBOT landing experience. The first GitHub branch is a **fresh, minimal browser preview**, not yet a verified import of all files from the earlier local OpenSea v0.5 archive.

## Run

```bash
npm install
npm run dev
```

Build with `npm run build`. Vercel preset: **Vite**; build command `npm run build`; output directory `dist`.

## Status

- Four navigable portals: Radar, Genesis, Lucky Bot, DAO.
- Optional injected-wallet connection.
- **No live OpenSea API integration yet.**
- **No NFT trading, minting, payouts, deployed contracts or live DAO.**
- Token fee concept: 10% (8% treasury, 2% team).
- NFT sales concept: 50% of gross proceeds to ARTBOT buyback and burn.
- Lucky Bot concept: 50% of eligible net NFT sale profit, subject to liquidity limits.
- Genesis NFT royalties: target 10%, marketplace-dependent.

Financial operations remain disabled pending implementation, audit and legal review.
