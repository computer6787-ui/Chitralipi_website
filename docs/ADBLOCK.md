# Ad blocking on Chitralipi

## Why the site cannot fix this itself

`/watch/[id]` embeds the player in a **cross-origin iframe**. The default source
is VidLink:

```jsx
<iframe src="https://vidlink.pro/movie/{id}" allow="fullscreen" allowfullscreen />
```

> VidLink is the default provider
> served inside its cross-origin player. Use a browser content blocker if needed.

The same-origin policy means `chitralipi` code cannot read or modify anything
inside that frame. Popunders, overlay click-bait and ad iframes are injected by
the player's host, so **no server-side or React-side change can remove them**.
Blocking has to happen in your browser, on your machine. (The other providers
in `src/lib/providers.js` behave the same way — only the host changes.)

The player frame sets a title and referrer policy, but that is defence in depth,
not ad blocking.

> Do not add a `sandbox` attribute without testing every active provider:
> sandbox restrictions can prevent third-party players from working, and
> relaxing them may not provide meaningful isolation.

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
