// Stylesheet of the preview iframe document (see website-page-preview.util.ts). The
// document is sandboxed, so it carries its own styles instead of the admin theme.
export const PREVIEW_DOCUMENT_STYLES = `
  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;
  }

  body {
    min-height: 100vh;
    background: #ffffff;
    color: #252525;
    font-family:
      Inter,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
    line-height: 1.7;
  }

  img {
    display: block;
    max-width: 100%;
  }

  a {
    color: inherit;
    pointer-events: none;
  }

  .page {
    min-height: 100vh;
    background: #ffffff;
  }

  .hero-image {
    width: 100%;
    max-height: 520px;
    object-fit: cover;
  }

  .header {
    padding: clamp(40px, 7vw, 88px) 24px 32px;
    text-align: center;
  }

  .header-inner {
    width: min(100%, 920px);
    margin: 0 auto;
  }

  h1 {
    margin: 0;
    font-size: clamp(32px, 6vw, 64px);
    line-height: 1.1;
    letter-spacing: -0.03em;
  }

  .excerpt {
    max-width: 720px;
    margin: 24px auto 0;
    color: #666666;
    font-size: clamp(16px, 2vw, 20px);
  }

  .content {
    width: min(calc(100% - 48px), 920px);
    margin: 0 auto;
    padding: 32px 0 80px;
  }

  .content h2,
  .content h3,
  .content h4 {
    line-height: 1.25;
    margin-top: 1.8em;
  }

  .content p {
    margin: 0 0 1.2em;
  }

  .content img {
    height: auto;
    margin: 32px auto;
    border-radius: 8px;
  }

  .content blockquote {
    margin: 32px 0;
    padding: 16px 24px;
    border-left: 4px solid #dddddd;
    background: #f8f8f8;
  }

  .content table {
    display: block;
    width: 100%;
    overflow-x: auto;
    border-collapse: collapse;
  }

  .content th,
  .content td {
    padding: 10px 12px;
    border: 1px solid #dddddd;
  }

  .gallery {
    width: min(calc(100% - 48px), 1080px);
    margin: 0 auto;
    padding: 0 0 80px;
  }

  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
  }

 .gallery-item {
    margin: 0;
    overflow: hidden;
    border: 1px solid #eeeeee;
    border-radius: 12px;
    background: #ffffff;
  }

  .gallery-item img {
    width: 100%;
    aspect-ratio: 16 / 10;
    object-fit: cover;
  }

  .gallery-caption {
    padding: 14px 16px;
    color: #666666;
    font-size: 14px;
  }

  .gadget-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    background: #f4f5f7;
  }

  .gadget-main,
  .gadget-side,
  .gadget-tile {
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, #f7f7f7, #eceff3);
  }

  .gadget-main { min-height: 460px; }
  .gadget-side { min-height: 230px; }

  .gadget-side-column {
    display: grid;
    grid-template-rows: repeat(2, minmax(0, 1fr));
  }

  .gadget-tiles {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .gadget-tile { aspect-ratio: 11 / 9; }

  .about-page {
    width: min(calc(100% - 48px), 1280px);
    margin: 0 auto;
    padding: clamp(40px, 6vw, 80px) 0 80px;
  }

  .about-heading {
    width: min(100%, 920px);
    margin: 0 auto 32px;
    text-align: center;
  }

  .about-heading h1 {
    font-size: clamp(30px, 5vw, 52px);
  }

  .about-image {
    width: 100%;
    height: auto;
    border-radius: 8px;
  }

  .about-highlights {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 28px;
    margin-top: 40px;
  }

  .about-highlight h2 {
    margin: 0 0 10px;
    font-size: 22px;
    line-height: 1.25;
  }

  .about-highlight p {
    margin: 0;
    color: #666666;
  }

  .gadget-main img,
  .gadget-side img,
  .gadget-tile img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .gadget-slot-label {
    position: absolute;
    inset: 50% auto auto 50%;
    transform: translate(-50%, -50%);
    color: #8a8f98;
    font-size: 13px;
    white-space: nowrap;
  }

  .home-preview-section {
    width: min(calc(100% - 48px), 1280px);
    margin: 0 auto;
    padding: clamp(40px, 6vw, 72px) 0;
    border-top: 1px dashed #d9dde3;
  }

  .latex-heading {
    max-width: 760px;
    margin: 0 auto 36px;
    text-align: center;
  }

  .latex-heading span,
  .ad-copy span {
    color: #d99a26;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: .14em;
  }

  .latex-heading h2 {
    margin: 8px 0 12px;
    color: #202c3c;
    font-size: clamp(28px, 4vw, 42px);
    line-height: 1.15;
  }

  .latex-heading p { margin: 0; color: #626b78; }

  .latex-layout {
    display: grid;
    grid-template-columns: 320px minmax(0, 1fr);
    gap: 28px;
  }

  .latex-tabs { display: flex; flex-direction: column; gap: 10px; }
  .latex-tab {
    display: flex;
    gap: 12px;
    padding: 15px 18px;
    border: 1px solid #e2e5e9;
    border-radius: 9px;
    background: #fff;
    color: #334155;
    font: inherit;
    font-weight: 700;
    text-align: left;
    cursor: pointer;
  }
  .latex-tab strong { color: #788392; }
  .latex-tab.active { background: #202c3c; color: #fff; border-color: #202c3c; }
  .latex-tab.active strong { color: #d99a26; }

  .latex-panel-wrap {
    display: flex;
    align-items: center;
    min-height: 360px;
    padding: clamp(28px, 5vw, 52px);
    border-radius: 20px;
    background-color: rgba(32, 44, 60, .94);
    background-image: radial-gradient(rgba(255, 255, 255, .05) 15%, transparent 16%);
    background-size: 16px 16px;
    color: #fff;
  }
  .latex-panel { display: none; }
  .latex-panel.active { display: block; }
  .latex-panel h3 { margin: 0 0 18px; color: #fff; font-size: 28px; }
  .latex-panel h3 strong { color: #d99a26; margin-right: 12px; }
  .latex-panel p { margin: 0; color: #d0d7de; }

  .home-placeholder-heading { margin: 0 0 20px; color: #202c3c; font-size: 28px; }
  .home-placeholder-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
  .home-placeholder-card { min-height: 140px; border-radius: 10px; background: #f2f4f7; }

  .home-ad {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 28px;
    min-height: 240px;
    padding: clamp(30px, 5vw, 62px);
    border-radius: 18px;
    background: #202c3c center / cover no-repeat;
    color: #fff;
  }
  .ad-copy { max-width: 720px; }
  .ad-copy h2 { margin: 9px 0 12px; color: #fff; font-size: clamp(28px, 4vw, 46px); line-height: 1.12; }
  .ad-copy p { margin: 0; color: rgba(255,255,255,.76); }
  .ad-button { flex: 0 0 auto; padding: 14px 20px; border-radius: 8px; background: #f5a400; color: #172231; font-weight: 800; }

  @media (max-width: 640px) {
    .header {
      padding-top: 36px;
    }

    .content,
    .gallery {
      width: min(calc(100% - 32px), 920px);
    }

    .gallery-grid {
      grid-template-columns: 1fr;
    }

    .gadget-grid { grid-template-columns: 1fr; }
    .gadget-side-column { display: none; }
    .gadget-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .gadget-main { min-height: 360px; }
    .about-page { width: min(calc(100% - 32px), 1280px); }
    .about-highlights { grid-template-columns: 1fr; gap: 24px; }
    .home-preview-section { width: min(calc(100% - 32px), 1280px); }
    .latex-layout { grid-template-columns: 1fr; }
    .latex-tabs { flex-direction: row; overflow: auto; }
    .latex-tab { flex: 0 0 auto; }
    .home-placeholder-grid { grid-template-columns: 1fr; }
    .home-ad { align-items: flex-start; flex-direction: column; }
  }
`;
