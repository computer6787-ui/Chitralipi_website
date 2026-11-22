"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GENRES, SORTS } from "@/lib/tmdb";
import { IconClose } from "@/components/icons";
import { GENRE_COLLECTION, resolveGenreFilter } from "@/lib/genre-collection";

/**
 * Genre + sort filters for the browse pages.
 *
 * State lives in the URL so a filtered view can be linked and survives a
 * reload. Changing a control resets `page` - keeping the old page number with
 * new filters lands you on an empty grid.
 */
export default function FilterBar({ mediaType, total, resultLabel = "titles" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const genres = GENRES[mediaType] ?? [];
  const activeGenre = params.get("genre") ?? "";
  const activeSort = params.get("sort") ?? "popular";
  const [genreOpen, setGenreOpen] = useState(false);
  const [genreSearch, setGenreSearch] = useState("");

  const matchingGenres = GENRE_COLLECTION
    .map((genre, index) => ({ ...genre, index }))
    .filter((genre) => genre.name.toLowerCase().includes(genreSearch.trim().toLowerCase()));
  const activeOption =
    GENRE_COLLECTION.find((genre) => genre.id === activeGenre) ??
    GENRE_COLLECTION.find(
      (genre) => resolveGenreFilter(genre.id, mediaType) === activeGenre,
    );
  const activeLegacyGenre = genres.find((genre) => String(genre.id) === activeGenre);
  const activeGenreName = activeOption?.name ?? activeLegacyGenre?.name;

  function apply(updates) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    next.delete("page"); // new filters => start from page 1
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    if (Object.prototype.hasOwnProperty.call(updates, "genre")) {
      setGenreOpen(false);
      setGenreSearch("");
    }
  }

  // One control vocabulary for both axes. Selected = filled accent, the
  // resting state = a flat plate, so the two are never confused at a glance.
  const chip = (active) =>
    `rounded-full px-3.5 py-1.5 text-[12.5px] font-medium whitespace-nowrap transition-[background-color,color,border-color,transform] duration-200 ease-[var(--ease-standard)] active:scale-[0.97] ${
      active
        ? "border border-chit-500/50 bg-chit-500/15 text-chit-300"
        : "border border-ink-700 bg-ink-850/60 text-ink-300 hover:border-ink-600 hover:bg-ink-800 hover:text-ink-100"
    }`;

  return (
    <div className="space-y-4">
      {/* Sort */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow mr-1 text-ink-400">Sort</span>
        {SORTS.map((sort) => {
          const active = activeSort === sort.id;
          return (
            <button
              key={sort.id}
              type="button"
              onClick={() => apply({ sort: sort.id === "popular" ? "" : sort.id })}
              aria-pressed={active}
              className={chip(active)}
            >
              {sort.label}
            </button>
          );
        })}
      </div>

      {/* Genres */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1 text-ink-400">Genre</span>
          <button
            type="button"
            onClick={() => apply({ genre: "" })}
            aria-pressed={activeGenre === ""}
            className={chip(activeGenre === "")}
          >
            All
          </button>
          <button
            type="button"
            aria-expanded={genreOpen}
            aria-controls="genre-collection"
            onClick={() => setGenreOpen((open) => !open)}
            className={`inline-flex max-w-full items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
              activeGenre
                ? "border border-chit-500/50 bg-chit-500/15 text-chit-300"
                : "border border-ink-700 bg-ink-850/60 text-ink-300 hover:border-ink-600 hover:bg-ink-800 hover:text-ink-100"
            }`}
          >
            <span className="truncate">{activeGenreName || "Browse genres"}</span>
            <span aria-hidden="true" className={`transition-transform ${genreOpen ? "rotate-90" : ""}`}>
              ›
            </span>
          </button>
        </div>

        {genreOpen && (
          <section
            id="genre-collection"
            aria-label="Genre collection"
            className="max-w-3xl rounded-xl border border-ink-700 bg-ink-950/95 p-3 shadow-[var(--elev-3)] sm:p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-ink-100">Genre collection</h3>
              <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-400">
                {GENRE_COLLECTION.length} entries
              </span>
            </div>

            <label htmlFor="genre-search" className="sr-only">
              Search genres
            </label>
            <input
              id="genre-search"
              type="search"
              value={genreSearch}
              onChange={(event) => setGenreSearch(event.target.value)}
              placeholder="Search genres..."
              autoComplete="off"
              className="mt-3 h-11 w-full rounded-full border border-ink-700 bg-black px-4 text-sm text-ink-100 placeholder:text-ink-500 focus:border-chit-500/70 focus:outline-none focus:ring-2 focus:ring-chit-500/20"
            />

            <p aria-live="polite" className="mt-2 text-[11px] text-ink-400">
              Showing {matchingGenres.length} of {GENRE_COLLECTION.length}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-ink-500">
              Custom subgenres use the closest TMDB genre, so results may be broad.
            </p>

            <ul
              aria-label="Genre options"
              className="mt-2 max-h-[50vh] overflow-y-auto overscroll-contain border-t border-ink-800/80"
            >
              {matchingGenres.length ? (
                matchingGenres.map((genre) => {
                  const selected = genre.id === activeOption?.id;
                  return (
                    <li key={genre.id}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => apply({ genre: genre.id })}
                        className={`flex min-h-11 w-full items-center gap-3 border-b border-ink-800/60 px-1 text-left text-sm transition-colors hover:bg-ink-900 focus-visible:bg-ink-900 focus-visible:outline-none ${
                          selected ? "text-chit-300" : "text-ink-200"
                        }`}
                      >
                        <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-ink-500">
                          {genre.index + 1}.
                        </span>
                        <span>{genre.name}</span>
                        {selected && <span className="ml-auto pr-2 text-[11px]">Selected</span>}
                      </button>
                    </li>
                  );
                })
              ) : (
                <li className="px-2 py-6 text-center text-sm text-ink-400">
                  No genres match your search.
                </li>
              )}
            </ul>
          </section>
        )}
      </div>

      {/* Result count + clear */}
      <div className="flex min-h-6 flex-wrap items-center gap-3 text-[12px] text-ink-400">
        {typeof total === "number" && (
          <span className="tnum">
            <span className="font-semibold text-ink-200">{total.toLocaleString()}</span>{" "}
            {resultLabel}
          </span>
        )}
        {activeGenre && (
          <button
            type="button"
            onClick={() => apply({ genre: "" })}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-ink-400 transition-colors duration-200 hover:bg-ink-800 hover:text-ink-100"
          >
            <IconClose className="size-3" />
            Clear genre
          </button>
        )}
      </div>
    </div>
  );
}