const GENRE_NAMES = `
Action
Action Epic
Adult Animation
Adventure
Adventure Epic
Alien Invasion
Animal Adventure
Animation
Anime
Artificial Intelligence
B-Action
Baseball
Basketball
Beauty Competition
Beauty Makeover
B-Horror
Biography
Body Horror
Body Swap Comedy
Boxing
Buddy Comedy
Buddy Cop
Bumbling Detective
Business Reality TV
Caper
Car Action
Classical Musical
Classical Western
Comedy
Coming-of-Age
Computer Animation
Concert
Conspiracy Thriller
Contemporary Western
Cooking & Food
Cooking Competition
Cop Drama
Costume Drama
Cozy Mystery
Crime
Crime Documentary
Crime Reality TV
Cyber Thriller
Cyberpunk
Dark Comedy
Dark Fantasy
Dark Romance
Dating Reality TV
Desert Adventure
Dinosaur Adventure
Disaster
Docudrama
Documentary
Docuseries
Docusoap Reality TV
Drama
Drug Crime
Dystopian Sci-Fi
Epic
Erotic Thriller
Extreme Sport
Fairy Tale
Faith & Spirituality Documentary
Family
Fantasy
Fantasy Epic
Farce
Feel-Good Romance
Film Noir
Financial Drama
Folk Horror
Food Documentary
Football
Found Footage Horror
Game Show
Gangster
Giallo
Globetrotting Adventure
Gun Fu
Hand-Drawn Animation
Hard-boiled Detective
Heist
Hidden Camera
High-Concept Comedy
Historical Epic
History
History Documentary
Holiday
Holiday Animation
Holiday Comedy
Holiday Family
Holiday Romance
Home Improvement
Horror
Isekai
Iyashikei
Jason Statham Action
Josei
Jukebox Musical
Jungle Adventure
Kaiju
Korean Drama
Kung Fu
Legal Drama
Legal Thriller
Lifestyle
Martial Arts
Mecha
Medical Drama
Military Documentary
Mockumentary
Motorsport
Mountain Adventure
Music
Music Documentary
Musical
Mystery
Nature Documentary
News
One-Person Army
Paranormal Reality TV
Parody
Period Drama
Police Procedural
Political Documentary
Political Drama
Political Thriller
Pop Musical
Prison Drama
Psychological Drama
Psychological Horror
Psychological Thriller
Quest
Quirky Comedy
Quiz Show
Raunchy Comedy
Reality TV
Road Trip
Rock Musical
Romance
Romantic Comedy
Romantic Epic
Samurai
Satire
Science & Technology Documentary
Sci-Fi
Sci-Fi Epic
Screwball Comedy
Sea Adventure
Seinen
Serial Killer
Shōjo
Shōnen
Short
Showbiz Drama
Sitcom
Sketch Comedy
Slapstick
Slasher Horror
Slice of Life
Soap Opera
Soccer
Space Sci-Fi
Spaghetti Western
Splatter Horror
Sport
Sports Documentary
Spy
Stand-Up
Steampunk
Steamy Romance
Stoner Comedy
Stop Motion Animation
Superhero
Supernatural Fantasy
Supernatural Horror
Survival
Survival Competition
Suspense Mystery
Swashbuckler
Sword & Sandal
Sword & Sorcery
Talent Competition
Talk Show
Teen Adventure
Teen Comedy
Teen Drama
Teen Fantasy
Teen Horror
Teen Romance
Telenovela
Thriller
Time Travel
Tragedy
Tragic Romance
Travel
Travel Documentary
True Crime
Urban Adventure
Vampire Horror
War
War Epic
Water Sport
Werewolf Horror
Western
Western Epic
Whodunit
Witch Horror
Workplace Drama
Wuxia
`.trim().split(/\r?\n/);

const CATEGORY_IDS = {
  movie: {
    action: 28,
    adventure: 12,
    animation: 16,
    comedy: 35,
    crime: 80,
    documentary: 99,
    drama: 18,
    family: 10751,
    fantasy: 14,
    history: 36,
    horror: 27,
    music: 10402,
    mystery: 9648,
    news: 99,
    reality: 99,
    romance: 10749,
    science: 878,
    soap: 18,
    sport: 18,
    talk: 99,
    thriller: 53,
    war: 10752,
    western: 37,
  },
  tv: {
    action: 10759,
    adventure: 10759,
    animation: 16,
    comedy: 35,
    crime: 80,
    documentary: 99,
    drama: 18,
    family: 10751,
    fantasy: 10765,
    history: 99,
    horror: 10765,
    music: 10764,
    mystery: 9648,
    news: 10763,
    reality: 10764,
    romance: 18,
    science: 10765,
    soap: 10766,
    sport: 10764,
    talk: 10767,
    thriller: 9648,
    war: 10768,
    western: 37,
  },
};

const CATEGORY_MATCHERS = [
  ["documentary", /documentary|docudrama|docuseries|docusoap|mockumentary/],
  ["news", /\bnews\b/],
  ["talk", /talk show|quiz show|game show/],
  ["soap", /soap opera|telenovela/],
  ["reality", /reality|competition|hidden camera|lifestyle|home improvement|cooking|beauty makeover/],
  ["animation", /animation|anime|isekai|iyashikei|josei|seinen|shōjo|shōnen|mecha/],
  ["horror", /horror|slasher|vampire|werewolf|zombie|witch|paranormal|kaiju|giallo/],
  ["thriller", /thriller|suspense|spy|conspiracy/],
  ["science", /sci-fi|cyber|artificial intelligence|alien invasion|dystopian|space|time travel|steampunk/],
  ["fantasy", /fantasy|fairy tale|sword & sorcery/],
  ["western", /western/],
  ["war", /\bwar\b|military/],
  ["history", /history|historical|period|costume|biography/],
  ["sport", /sport|baseball|basketball|boxing|football|soccer|motorsport/],
  ["action", /action|martial arts|kung fu|gun fu|one-person army|samurai|wuxia|superhero/],
  ["romance", /romance|romantic|dating/],
  ["adventure", /adventure|quest|road trip|swashbuckler|dinosaur|survival|globetrotting|jungle|mountain|sea adventure|desert|disaster|epic/],
  ["crime", /crime|gangster|caper|cop|detective|heist|serial killer|police|prison/],
  ["mystery", /mystery|whodunit|film noir/],
  ["comedy", /comedy|farce|parody|satire|sitcom|slapstick|screwball|stand-up|stoner|buddy comedy/],
  ["music", /music|musical|concert|jukebox|showbiz/],
  ["family", /family|holiday|teen|coming-of-age/],
  ["drama", /drama|tragedy/],
];

function categoriesFor(name) {
  const normalized = name.toLowerCase();

  if (/^(romantic comedy|feel-good romance)$/.test(normalized)) {
    return ["romance", "comedy"];
  }
  if (/^(crime documentary|true crime)$/.test(normalized)) {
    return ["crime", "documentary"];
  }
  if (normalized === "crime reality tv") {
    return ["crime", "reality"];
  }
  if (normalized === "history documentary") {
    return ["history", "documentary"];
  }
  if (normalized === "music documentary") {
    return ["music", "documentary"];
  }

  const match = CATEGORY_MATCHERS.find(([, pattern]) => pattern.test(normalized));
  return match ? [match[0]] : ["drama"];
}

function toId(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const GENRE_COLLECTION = GENRE_NAMES.map((name) => ({
  id: toId(name),
  name,
  categories: categoriesFor(name),
}));

const genreById = new Map(GENRE_COLLECTION.map((genre) => [genre.id, genre]));

export function resolveGenreFilter(value, mediaType) {
  if (typeof value !== "string" || !CATEGORY_IDS[mediaType]) return null;
  if (/^\d+(?:[,|]\d+)*$/.test(value)) return value;

  const genre = genreById.get(value);
  if (!genre) return null;

  return [...new Set(genre.categories.map((category) => CATEGORY_IDS[mediaType][category]))]
    .filter(Number.isInteger)
    .join(",");
}
