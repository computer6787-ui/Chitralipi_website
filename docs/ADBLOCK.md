# Ad blocking on Chitralipi

## Why the site cannot fix this itself

`/watch/[id]` embeds the player in a **cross-origin iframe**. The default source
is CineSrc:

```jsx
<iframe src="https://cinesrc.st/embed/movie/{id}" allow="fullscreen" allowfullscreen />
```

> CineSrc is the default provider, but the site cannot control ads or scripts
> served inside its cross-origin player. Use a browser content blocker if needed.

The same-origin policy means `chitralipi` code cannot read or modify anything
inside that frame. Popunders, overlay click-bait and ad iframes are injected by
the player's host, so **no server-side or React-side change can remove them**.
Blocking has to happen in your browser, on your machine. (The other providers
in `src/lib/providers.js` behave the same way — only the host changes.)

The player frame sets a title and referrer policy, but that is defence in depth,
not ad blocking.

> **Do not add a `sandbox` attribute to the player iframe.** It was tried and
> reverted: the player refuses to render inside a sandboxed frame ("This
> content can't be embedded in a sandboxed frame") and playback fails outright.
> The `vsembed.ru` player behind the VidSrc provider does this deliberately,
> via an anti-sandbox script (`sbx.js`) that redirects to `/sandbox.php` when
> it detects a `sandbox` attribute on a parent frame.
> If you ever revisit it, `allow-same-origin` + `allow-scripts` together also
> provide no real isolation for a cross-origin frame, so the attribute only
> risks breaking the player.
>
> The same rule applies to any frame we embed: beyond the anti-sandbox
> script, a token list missing `allow-presentation`, `allow-pointer-lock`,
> `allow-modals` and `allow-top-navigation-by-user-activation` is enough to stop
> video playing inside it. Untrusted content belongs in a real browser
> process, where Chromium's process isolation applies.

## The two options

Pick Brave if you already use it; otherwise, install uBlock Origin.

| Option | Stops popups/click-bait | Stops ad *network* requests | Effort |
| --- | --- | --- | --- |
| [Brave browser](#1-brave-browser-recommended) | Yes | Yes | **Nothing** |
| [uBlock Origin](#2-ublock-origin) | Yes | Yes | Install from store |

## How Brave does it (and why a site cannot copy it)

Brave Shields is not an add-on. Brave is a **Chromium fork** whose network layer
runs the [`adblock-rs`](https://github.com/brave/adblock-rs) engine in Rust
**before any request leaves the machine**, including requests from inside
third-party iframes like this player. It consumes **EasyList + EasyPrivacy** —
the same lists uBlock Origin uses — plus its own curated list.

The important part: that engine lives **above** the page, inside the browser. A
website has no API to reach it. So on Brave there is nothing to install, and on
any other browser one of the options above is what stands in for it.

## What the player actually loads

Verified by fetching the live VidSrc player (Sept 2026). That chain is
`vidsrc.mov/embed/movie/{id}` → inner frame `vsembed.ru/embed/movie/{id}` →
ad servers on that page:

| Host | Role |
| --- | --- |
| `dpjf9a2rbjbvp.cloudfront.net` | Popunder / clickbait loader, injected by the embed page |
| `s10.histats.com` | Histats tracker (`js15_as.js`) |
| `sstatic1.histats.com` | Histats 1×1 tracking pixel |
| `static.cloudflareinsights.com` | Cloudflare Web Analytics beacon |
| `vsembed.ru` | Inner player frame (script `/assets/sbx.js`) |

`sbx.js` is a dedicated **anti-sandbox** script: if it detects a `sandbox`
attribute on a parent frame, it redirects itself to `/sandbox.php`. That is why
adding `sandbox` to our iframe broke playback — see the warning above.

### 1. Brave browser (recommended)

Nothing to install. Shields is on by default for every site.

1. Nothing to install.
2. Brave Shields is on by default for every site.
3. If a site ever breaks, click the Shields icon in the address bar to toggle
   it for that site only.

This is the recommended option because it is already there — the engine ships
inside the browser, so there is no extension to maintain, no filter lists to
update and no extra process running.

### 2. uBlock Origin

The right pick on any browser that is not Brave. If you install only one thing,
install this.

1. Install [uBlock Origin](https://ublockorigin.com/) from your browser's
   official store.
2. **Settings → Filter lists**: keep EasyList, EasyPrivacy and Fanboy's
   Annoyances enabled (these are the defaults).
3. **Settings → Filter assets**: leave the defaults enabled.

No Chitralipi-specific setup is needed.
