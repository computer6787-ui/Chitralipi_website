"use client";

import Link from "next/link";
import { noteIntent } from "@/lib/nav-state";

/** Only paths inside the app are ours to navigate. */
function isInternal(href) {
  return typeof href === "string" && href.startsWith("/") && !href.startsWith("//");
}

/**
 * Starts route progress on internal navigation without prefetching unused pages.
 */
export default function IntentLink({ href, children, onClick, ...rest }) {
  function press(event) {
    // Ignore modified clicks: those open a new tab or window, so this page never
    // navigates and must not claim that it is loading.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    // `SectionHead` renders `href="#"` when a shelf has no destination. That is
    // a same-page anchor, not a route change, so announcing intent for it would
    // start a progress bar for a navigation that is never going to happen.
    if (!isInternal(href)) return;
    noteIntent();
    onClick?.(event);
  }

  return (
    <Link
      {...rest}
      href={href}
      prefetch={false}
      onClick={press}
    >
      {children}
    </Link>
  );
}
