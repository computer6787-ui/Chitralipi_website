/**
 * Video embed providers configuration.
 * 
 * Each provider supports movie and TV embed URLs.
 * Some providers may have additional features like anime support.
 */

export const PROVIDERS = [
  {
    id: 'vidlink',
    name: 'VidLink',
    tag: 'Recomended • Low Ads',
    movie: 'https://vidlink.pro/movie',
    tv: 'https://vidlink.pro/tv',
    default: true,
  },

  {
    id: 'cinesrc',
    name: 'CineSrc',
    tag: 'Low Ads • Quality',
    movie: 'https://cinesrc.st/embed/movie',
    tv: 'https://cinesrc.st/embed/tv',
    
  },

  {
    id: 'filmu',
    name: 'Filmu',
    tag: 'Vast Library',
    movie: 'https://embed.filmu.in/movie',
    tv: 'https://embed.filmu.in/tv',
    anime: 'https://embed.filmu.in/anime',
  },
  {
    id: 'multiembed',
    name: 'MultiEmbed',
    tag: 'HD Quality',
    movie: 'https://multiembed.cc/embed/movie',
    tv: 'https://multiembed.cc/embed/tv',
  },
  {
    id: 'vidcore',
    name: 'VidCore',
    tag: 'Modern & Interactive',
    movie: 'https://vidcore.org/embed/movie',
    tv: 'https://vidcore.org/embed/series',
  },

  {
    id: 'vidsrc-sh',
    name: 'VidSrc',
    tag: 'Official • Big Catalog',
    movie: 'https://vidsrc.sh/embed/movie',
    tv: 'https://vidsrc.sh/embed/tv',
  },
  {
    id: 'embedapi',
    name: 'Embed-API',
    tag: 'IMDb + TMDB',
    movie: 'https://embed-api.stream/embed/movie',
    tv: 'https://embed-api.stream/embed/tv',
  },
  {
    id: 'embedwave',
    name: 'EmbedWave',
    tag: 'No Ads Claimed',
    movie: 'https://embedwave.cc/embed/movie',
    tv: 'https://embedwave.cc/embed/tv',
  },
  {
    id: 'vidfast',
    name: 'VidFast',
    tag: 'Fast Load',
    movie: 'https://vidfast.pro/movie',
    tv: 'https://vidfast.pro/tv',
  },
  {
    id: 'vidsrc2',
    name: 'VidSrc RU',
    tag: 'Official Mirror',
    movie: 'https://vidsrc2.ru/embed/movie',
    tv: 'https://vidsrc2.ru/embed/tv',
  },
  {
    id: 'vidsrc-ir',
    name: 'VidSrc IR',
    tag: 'Official Mirror',
    movie: 'https://vidsrc.ir/embed/movie',
    tv: 'https://vidsrc.ir/embed/tv',
  },
  {
    id: 'vidsrc-me',
    name: 'VidSrc ME',
    tag: 'Legacy Domain',
    movie: 'https://vidsrc.me/embed/movie',
    tv: 'https://vidsrc.me/embed/tv',
  },
  {
    id: 'vidsrc-bz',
    name: 'VidSrc BZ',
    tag: 'Legacy Domain',
    movie: 'https://vidsrc.bz/embed/movie',
    tv: 'https://vidsrc.bz/embed/tv',
  },
  {
    id: 'vidsrc-gd',
    name: 'VidSrc GD',
    tag: 'Legacy Domain',
    movie: 'https://vidsrc.gd/embed/movie',
    tv: 'https://vidsrc.gd/embed/tv',
  },
  {
    id: 'vidsrc-buzz',
    name: 'VidSrc Buzz',
    tag: 'Multi-Server',
    movie: 'https://vidsrc.buzz/embed/movie',
    tv: 'https://vidsrc.buzz/embed/tv',
  },
  {
    id: 'vixsrc',
    name: 'VixSrc',
    tag: 'Alternative',
    movie: 'https://vixsrc.to/movie',
    tv: 'https://vixsrc.to/tv',
  },
];


/** Get the default provider */
export function getDefaultProvider() {
  return PROVIDERS.find(p => p.default) || PROVIDERS[0];
}

/** Get a provider by id */
export function getProvider(id) {
  return PROVIDERS.find(p => p.id === id) || getDefaultProvider();
}
