# TAI OpenAI Hackathon

Instagram carousel generator for SMB marketing. The app turns an X/Twitter post link or pasted source text into a branded Instagram carousel with:

- A cover slide based on a reusable HTML template
- Multiple content slides split from the source post or thread text
- A final CTA slide
- Optional `gpt-image-2` cover-image generation through the OpenAI Images API
- X post/thread fetching through xAI when `XAI_API_KEY` is present
- Branding presets for Growth Loop, Terminal, Bullion, and Voltage
- HTML copy/download export for reuse

## Run locally

```bash
npm run dev
```

Open `http://localhost:5173`.

To enable cover image generation:

```bash
OPENAI_API_KEY=your_api_key npm run dev
```

To enable X/Twitter fetching through xAI, add this to `.env`:

```bash
XAI_API_KEY=your_xai_api_key
```

You can override the image model if needed:

```bash
OPENAI_IMAGE_MODEL=gpt-image-2 OPENAI_API_KEY=your_api_key npm run dev
```

You can override the xAI model if needed:

```bash
XAI_MODEL=grok-4.3 npm run dev
```

## Notes

The app tries xAI first when `XAI_API_KEY` is available, then falls back to public X embed/syndication endpoints. Public endpoints can return only the visible post and may block or omit full thread content. When that happens, paste the thread text into the fallback field and the same carousel templates still render.
