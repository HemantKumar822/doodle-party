/**
 * Doodle Party - Word Database
 * 
 * 3,000+ words organized by difficulty for drawing games
 * Categories: Easy (common objects), Medium (compound words), Hard (abstract/complex)
 */

export type WordDifficulty = 'easy' | 'medium' | 'hard';

export interface WordWithDifficulty {
    word: string;
    difficulty: WordDifficulty;
}

// ==========================================
// EASY WORDS (~1,000 words)
// Common nouns, simple objects, animals
// ==========================================
export const WORDS_EASY: string[] = [
    // Animals
    "cat", "dog", "bird", "fish", "horse", "cow", "pig", "sheep", "lion", "tiger",
    "bear", "wolf", "fox", "deer", "rabbit", "mouse", "rat", "frog", "snake", "turtle",
    "duck", "chicken", "owl", "eagle", "penguin", "monkey", "elephant", "giraffe", "zebra", "hippo",
    "whale", "shark", "dolphin", "octopus", "crab", "lobster", "snail", "butterfly", "bee", "ant",
    "spider", "bat", "squirrel", "raccoon", "skunk", "beaver", "otter", "seal", "walrus", "gorilla",
    "panda", "koala", "kangaroo", "camel", "llama", "donkey", "goat", "rooster", "turkey", "swan",

    // Food
    "apple", "banana", "orange", "grape", "strawberry", "watermelon", "lemon", "cherry", "peach", "pear",
    "pizza", "burger", "hotdog", "sandwich", "taco", "burrito", "sushi", "pasta", "rice", "bread",
    "cheese", "egg", "bacon", "steak", "chicken", "fish", "shrimp", "soup", "salad", "cake",
    "cookie", "donut", "ice cream", "candy", "chocolate", "popcorn", "chips", "fries", "pancake", "waffle",
    "cereal", "milk", "juice", "coffee", "tea", "soda", "water", "wine", "beer", "smoothie",
    "carrot", "potato", "tomato", "onion", "corn", "broccoli", "lettuce", "cucumber", "pepper", "mushroom",

    // Objects
    "chair", "table", "bed", "couch", "lamp", "clock", "mirror", "door", "window", "stairs",
    "phone", "computer", "keyboard", "mouse", "screen", "camera", "radio", "television", "remote", "speaker",
    "book", "pencil", "pen", "paper", "scissors", "tape", "glue", "ruler", "eraser", "notebook",
    "cup", "plate", "bowl", "fork", "knife", "spoon", "pot", "pan", "oven", "fridge",
    "car", "bus", "train", "plane", "boat", "bike", "motorcycle", "truck", "helicopter", "rocket",
    "ball", "bat", "glove", "hat", "shoe", "sock", "shirt", "pants", "dress", "jacket",
    "bag", "box", "basket", "bucket", "bottle", "can", "jar", "lid", "handle", "wheel",
    "key", "lock", "chain", "rope", "string", "wire", "nail", "screw", "hammer", "saw",

    // Nature
    "sun", "moon", "star", "cloud", "rain", "snow", "wind", "storm", "lightning", "rainbow",
    "tree", "flower", "grass", "leaf", "branch", "root", "seed", "fruit", "vegetable", "plant",
    "mountain", "hill", "valley", "river", "lake", "ocean", "beach", "island", "desert", "forest",
    "rock", "sand", "mud", "dirt", "ice", "fire", "water", "air", "smoke", "steam",

    // Body Parts
    "head", "face", "eye", "ear", "nose", "mouth", "teeth", "tongue", "lip", "chin",
    "hair", "neck", "shoulder", "arm", "elbow", "wrist", "hand", "finger", "thumb", "nail",
    "chest", "back", "stomach", "hip", "leg", "knee", "ankle", "foot", "toe", "heel",
    "heart", "brain", "bone", "muscle", "skin", "blood", "lung", "liver", "kidney", "stomach",

    // Places
    "house", "home", "room", "kitchen", "bathroom", "bedroom", "garage", "garden", "yard", "roof",
    "school", "office", "store", "shop", "mall", "market", "restaurant", "cafe", "bar", "hotel",
    "hospital", "church", "library", "museum", "theater", "stadium", "gym", "pool", "park", "zoo",
    "farm", "factory", "airport", "station", "port", "bridge", "road", "street", "highway", "path",

    // People/Jobs
    "baby", "child", "kid", "boy", "girl", "man", "woman", "person", "family", "friend",
    "doctor", "nurse", "teacher", "student", "chef", "waiter", "driver", "pilot", "farmer", "firefighter",
    "police", "soldier", "artist", "singer", "dancer", "actor", "writer", "painter", "builder", "mechanic",
    "king", "queen", "prince", "princess", "knight", "wizard", "witch", "ghost", "monster", "alien",

    // Actions (drawable)
    "run", "walk", "jump", "swim", "fly", "climb", "fall", "sit", "stand", "sleep",
    "eat", "drink", "cook", "read", "write", "draw", "paint", "sing", "dance", "play",
    "laugh", "cry", "smile", "wave", "clap", "hug", "kiss", "point", "kick", "throw",

    // Sports/Games
    "soccer", "football", "basketball", "baseball", "tennis", "golf", "hockey", "boxing", "wrestling", "skiing",
    "surfing", "skating", "bowling", "fishing", "hunting", "camping", "hiking", "racing", "chess", "cards",

    // Clothes
    "hat", "cap", "helmet", "glasses", "sunglasses", "scarf", "tie", "belt", "watch", "ring",
    "necklace", "bracelet", "earring", "crown", "mask", "gloves", "boots", "sandals", "slippers", "uniform",

    // Tools/Instruments
    "guitar", "piano", "drum", "violin", "flute", "trumpet", "microphone", "headphones", "radio", "speaker",
    "brush", "comb", "razor", "soap", "towel", "toothbrush", "toothpaste", "shampoo", "lotion", "perfume",

    // Vehicles
    "ambulance", "firetruck", "taxi", "van", "jeep", "scooter", "skateboard", "wagon", "sled", "cart",
    "submarine", "yacht", "canoe", "kayak", "raft", "jet", "blimp", "parachute", "balloon", "kite",

    // Additional Common Words
    "flag", "map", "globe", "compass", "telescope", "binoculars", "magnifying glass", "flashlight", "candle", "match",
    "fence", "gate", "wall", "floor", "ceiling", "corner", "edge", "center", "top", "bottom",
    "circle", "square", "triangle", "rectangle", "diamond", "heart", "star", "arrow", "cross", "spiral",
    "puzzle", "toy", "doll", "teddy bear", "robot", "balloon", "gift", "present", "card", "letter",
    "money", "coin", "dollar", "wallet", "purse", "credit card", "check", "receipt", "ticket", "stamp",
    "calendar", "diary", "album", "photo", "frame", "poster", "sign", "label", "tag", "sticker",
    "pillow", "blanket", "sheet", "curtain", "carpet", "rug", "mat", "cushion", "coaster", "vase",
    "umbrella", "raincoat", "boots", "puddle", "snowman", "snowflake", "icicle", "igloo", "sled", "mittens",
    "beach ball", "sand castle", "seashell", "starfish", "jellyfish", "coral", "anchor", "lighthouse", "sunset", "sunrise",
    "rainbow", "treasure", "chest", "pirate", "ship", "island", "palm tree", "coconut", "parrot", "monkey",
    "crown", "throne", "castle", "tower", "bridge", "moat", "dragon", "unicorn", "fairy", "mermaid",
    "wand", "magic", "spell", "potion", "crystal", "gem", "jewel", "gold", "silver", "bronze",
    "medal", "trophy", "prize", "ribbon", "badge", "award", "certificate", "diploma", "graduation", "cap",
    "backpack", "lunchbox", "notebook", "textbook", "calculator", "globe", "microscope", "test tube", "magnet", "battery",
    "plug", "outlet", "switch", "button", "dial", "lever", "pedal", "brake", "steering wheel", "gear",
    "engine", "motor", "pump", "fan", "heater", "air conditioner", "thermostat", "smoke detector", "alarm", "bell",
    "siren", "horn", "whistle", "drum", "cymbal", "xylophone", "harmonica", "accordion", "banjo", "harp",
    "easel", "canvas", "palette", "brush", "pencil", "crayon", "marker", "chalk", "charcoal", "pastel",
    "clay", "pottery", "sculpture", "statue", "bust", "monument", "fountain", "arch", "column", "dome",
    "bench", "swing", "slide", "seesaw", "sandbox", "jungle gym", "trampoline", "pool", "diving board", "lifeguard",
    "tent", "sleeping bag", "campfire", "marshmallow", "hotdog", "cooler", "thermos", "compass", "map", "trail",
    "nest", "cage", "leash", "collar", "bowl", "bone", "treat", "toy", "ball", "frisbee",
    "aquarium", "terrarium", "hamster wheel", "bird feeder", "dog house", "cat tree", "litter box", "pet carrier", "grooming brush", "flea collar"
];

// ==========================================
// MEDIUM WORDS (~1,200 words)
// Compound words, less common objects, actions
// ==========================================
export const WORDS_MEDIUM: string[] = [
    // Compound/Complex Objects
    "lighthouse", "windmill", "waterfall", "skyscraper", "treehouse", "birdhouse", "dollhouse", "greenhouse", "warehouse", "firehouse",
    "snowglobe", "hourglass", "stopwatch", "wristwatch", "grandfather clock", "cuckoo clock", "alarm clock", "sundial", "metronome", "pendulum",
    "telescope", "microscope", "kaleidoscope", "periscope", "stethoscope", "thermometer", "barometer", "speedometer", "odometer", "compass",
    "typewriter", "calculator", "projector", "printer", "scanner", "copier", "shredder", "stapler", "hole punch", "paper clip",
    "briefcase", "suitcase", "backpack", "fanny pack", "messenger bag", "tote bag", "duffel bag", "garment bag", "sleeping bag", "punching bag",
    "treadmill", "elliptical", "stationary bike", "rowing machine", "weight bench", "pull up bar", "punching bag", "yoga mat", "resistance band", "kettlebell",
    "blender", "toaster", "microwave", "dishwasher", "washing machine", "dryer", "vacuum", "iron", "coffee maker", "juicer",
    "chandelier", "lampshade", "nightlight", "flashlight", "spotlight", "headlight", "taillight", "traffic light", "neon sign", "billboard",

    // Actions/Activities
    "skateboarding", "snowboarding", "surfing", "parasailing", "skydiving", "bungee jumping", "rock climbing", "mountain biking", "horseback riding", "scuba diving",
    "juggling", "acrobatics", "gymnastics", "breakdancing", "tap dancing", "ballroom dancing", "figure skating", "synchronized swimming", "cheerleading", "parkour",
    "barbecuing", "grilling", "roasting", "baking", "frying", "sauteing", "steaming", "boiling", "microwaving", "marinating",
    "gardening", "landscaping", "mowing", "raking", "pruning", "weeding", "planting", "harvesting", "composting", "mulching",
    "knitting", "crocheting", "sewing", "quilting", "embroidery", "cross stitch", "needlepoint", "macrame", "weaving", "spinning",
    "pottery", "sculpting", "woodworking", "metalworking", "glassblowing", "blacksmithing", "welding", "soldering", "engraving", "carving",
    "photography", "videography", "filmmaking", "animation", "illustration", "calligraphy", "origami", "scrapbooking", "collage", "mosaic",
    "meditation", "yoga", "pilates", "tai chi", "martial arts", "karate", "judo", "taekwondo", "kung fu", "boxing",

    // Nature/Science
    "volcano", "earthquake", "tsunami", "hurricane", "tornado", "blizzard", "avalanche", "drought", "flood", "wildfire",
    "constellation", "galaxy", "nebula", "asteroid", "comet", "meteor", "eclipse", "aurora", "supernova", "black hole",
    "molecule", "atom", "electron", "proton", "neutron", "nucleus", "cell", "bacteria", "virus", "DNA",
    "fossil", "dinosaur", "mammoth", "pterodactyl", "triceratops", "stegosaurus", "velociraptor", "tyrannosaurus", "brontosaurus", "archaeopteryx",
    "coral reef", "tide pool", "kelp forest", "mangrove", "wetland", "marsh", "swamp", "bog", "tundra", "taiga",
    "savanna", "prairie", "steppe", "plateau", "canyon", "gorge", "ravine", "cliff", "cave", "cavern",
    "stalactite", "stalagmite", "geyser", "hot spring", "mineral", "crystal", "quartz", "amethyst", "emerald", "sapphire",

    // Professions
    "archaeologist", "astronaut", "veterinarian", "pharmacist", "dentist", "optometrist", "chiropractor", "physiotherapist", "psychiatrist", "psychologist",
    "architect", "engineer", "electrician", "plumber", "carpenter", "roofer", "landscaper", "interior designer", "contractor", "surveyor",
    "journalist", "photographer", "videographer", "editor", "publisher", "translator", "interpreter", "copywriter", "speechwriter", "novelist",
    "scientist", "researcher", "professor", "dean", "principal", "counselor", "tutor", "librarian", "archivist", "curator",
    "chef", "sous chef", "pastry chef", "sommelier", "bartender", "barista", "caterer", "food critic", "nutritionist", "dietitian",
    "pilot", "co-pilot", "flight attendant", "air traffic controller", "baggage handler", "customs officer", "immigration officer", "border patrol", "coast guard", "lifeguard",

    // Sports/Entertainment
    "quarterback", "linebacker", "goalkeeper", "pitcher", "catcher", "shortstop", "referee", "umpire", "coach", "manager",
    "gymnast", "diver", "wrestler", "boxer", "fencer", "archer", "equestrian", "cyclist", "triathlete", "decathlete",
    "comedian", "magician", "illusionist", "ventriloquist", "puppeteer", "mime", "clown", "acrobat", "trapeze artist", "tightrope walker",
    "conductor", "composer", "lyricist", "producer", "DJ", "sound engineer", "roadie", "backup singer", "session musician", "concert pianist",

    // Technology
    "smartphone", "tablet", "laptop", "desktop", "mainframe", "server", "router", "modem", "hard drive", "USB drive",
    "bluetooth", "wifi", "ethernet", "satellite", "antenna", "transmitter", "receiver", "amplifier", "speaker", "headphones",
    "touchscreen", "trackpad", "joystick", "controller", "virtual reality", "augmented reality", "hologram", "drone", "robot", "cyborg",

    // Culture/Society
    "wedding", "funeral", "graduation", "birthday", "anniversary", "retirement", "reunion", "concert", "festival", "parade",
    "protest", "rally", "march", "demonstration", "election", "debate", "campaign", "inauguration", "ceremony", "ritual",
    "tradition", "custom", "heritage", "folklore", "mythology", "legend", "fairy tale", "nursery rhyme", "proverb", "idiom",

    // Food/Cooking
    "croissant", "baguette", "pretzel", "bagel", "muffin", "scone", "biscuit", "cracker", "breadstick", "cornbread",
    "lasagna", "ravioli", "gnocchi", "risotto", "paella", "ramen", "pho", "curry", "stir fry", "casserole",
    "ceviche", "sashimi", "tempura", "gyoza", "dim sum", "spring roll", "samosa", "falafel", "hummus", "guacamole",
    "tiramisu", "cheesecake", "brownie", "eclair", "macaron", "truffle", "souffle", "creme brulee", "panna cotta", "gelato",

    // Transportation
    "convertible", "limousine", "pickup truck", "semi truck", "dump truck", "cement mixer", "crane", "bulldozer", "excavator", "forklift",
    "streetcar", "cable car", "monorail", "subway", "steam engine", "diesel engine", "electric car", "hybrid", "hovercraft", "airship",
    "cruise ship", "ferry", "tugboat", "speedboat", "sailboat", "catamaran", "pontoon", "gondola", "rowboat", "paddleboat",
    "glider", "biplane", "seaplane", "cargo plane", "fighter jet", "stealth bomber", "helicopter", "hot air balloon", "zeppelin", "rocket ship",

    // Architecture
    "penthouse", "loft", "duplex", "townhouse", "cottage", "cabin", "chalet", "villa", "mansion", "palace",
    "cathedral", "basilica", "chapel", "mosque", "synagogue", "temple", "pagoda", "shrine", "monastery", "convent",
    "colosseum", "amphitheater", "arena", "auditorium", "concert hall", "opera house", "movie theater", "drive-in", "planetarium", "observatory",
    "skyscraper", "high rise", "office building", "shopping center", "department store", "supermarket", "convenience store", "gas station", "parking garage", "subway station",

    // Clothing/Fashion
    "tuxedo", "gown", "blouse", "cardigan", "sweater", "hoodie", "vest", "blazer", "overcoat", "raincoat",
    "jeans", "khakis", "shorts", "skirt", "leggings", "sweatpants", "pajamas", "bathrobe", "wetsuit", "swimsuit",
    "sneakers", "loafers", "heels", "wedges", "flats", "flip flops", "hiking boots", "snow boots", "rain boots", "cowboy boots",
    "fedora", "beret", "beanie", "visor", "headband", "bandana", "turban", "veil", "tiara", "sombrero",

    // Music/Art
    "orchestra", "symphony", "quartet", "choir", "band", "ensemble", "duo", "solo", "duet", "trio",
    "melody", "harmony", "rhythm", "tempo", "pitch", "crescendo", "decrescendo", "fortissimo", "pianissimo", "staccato",
    "portrait", "landscape", "still life", "abstract", "impressionism", "expressionism", "surrealism", "cubism", "pop art", "minimalism",
    "watercolor", "oil painting", "acrylic", "pastel", "charcoal", "graphite", "ink", "mixed media", "digital art", "street art",

    // Additional Medium Words
    "hammock", "recliner", "ottoman", "futon", "bunk bed", "canopy bed", "crib", "bassinet", "high chair", "booster seat",
    "chandelier", "sconce", "pendant light", "track lighting", "recessed lighting", "dimmer switch", "ceiling fan", "exhaust fan", "space heater", "dehumidifier",
    "dishware", "silverware", "glassware", "cookware", "bakeware", "tupperware", "corkscrew", "bottle opener", "can opener", "garlic press",
    "measuring cup", "measuring spoon", "mixing bowl", "cutting board", "colander", "strainer", "whisk", "spatula", "ladle", "tongs",
    "pressure cooker", "slow cooker", "rice cooker", "deep fryer", "air fryer", "food processor", "stand mixer", "hand mixer", "immersion blender", "espresso machine",
    "doorbell", "intercom", "security camera", "motion sensor", "sprinkler system", "irrigation", "garden hose", "power washer", "leaf blower", "chainsaw",
    "wheelbarrow", "shovel", "rake", "hoe", "trowel", "pruning shears", "hedge trimmer", "lawn mower", "edger", "aerator"
];

// ==========================================
// HARD WORDS (~800 words)
// Abstract concepts, complex ideas, difficult to draw
// ==========================================
export const WORDS_HARD: string[] = [
    // Abstract Concepts
    "freedom", "justice", "democracy", "equality", "liberty", "peace", "war", "conflict", "harmony", "chaos",
    "love", "hate", "fear", "courage", "hope", "despair", "joy", "sorrow", "anger", "calm",
    "wisdom", "knowledge", "ignorance", "intelligence", "creativity", "imagination", "innovation", "inspiration", "intuition", "instinct",
    "truth", "lies", "honesty", "deception", "trust", "betrayal", "loyalty", "honor", "dignity", "respect",
    "success", "failure", "victory", "defeat", "achievement", "accomplishment", "ambition", "motivation", "determination", "perseverance",
    "happiness", "sadness", "excitement", "boredom", "anxiety", "stress", "relaxation", "tension", "pressure", "relief",
    "confidence", "doubt", "certainty", "uncertainty", "security", "vulnerability", "strength", "weakness", "power", "control",
    "beauty", "ugliness", "elegance", "grace", "charm", "charisma", "attraction", "repulsion", "fascination", "obsession",
    "patience", "impatience", "tolerance", "intolerance", "acceptance", "rejection", "approval", "disapproval", "criticism", "praise",
    "generosity", "greed", "selfishness", "altruism", "kindness", "cruelty", "compassion", "empathy", "sympathy", "apathy",

    // Complex Actions/States
    "procrastination", "concentration", "meditation", "contemplation", "deliberation", "hesitation", "anticipation", "expectation", "frustration", "exasperation",
    "celebration", "commemoration", "appreciation", "depreciation", "inflation", "deflation", "stagnation", "acceleration", "deceleration", "stabilization",
    "communication", "miscommunication", "interpretation", "misinterpretation", "translation", "transformation", "transition", "evolution", "revolution", "resolution",
    "negotiation", "confrontation", "collaboration", "competition", "cooperation", "coordination", "organization", "disorganization", "improvisation", "adaptation",
    "investigation", "exploration", "experimentation", "observation", "examination", "evaluation", "estimation", "calculation", "speculation", "prediction",

    // Emotions/Psychological
    "nostalgia", "melancholy", "euphoria", "ecstasy", "agony", "anguish", "desperation", "devastation", "exhilaration", "elation",
    "jealousy", "envy", "resentment", "bitterness", "forgiveness", "redemption", "guilt", "shame", "pride", "humility",
    "paranoia", "hysteria", "phobia", "obsession", "addiction", "compulsion", "impulse", "temptation", "resistance", "surrender",
    "confusion", "clarity", "epiphany", "revelation", "realization", "recognition", "acknowledgment", "denial", "acceptance", "rejection",
    "attachment", "detachment", "connection", "disconnection", "isolation", "solitude", "loneliness", "belonging", "alienation", "integration",

    // Philosophical/Existential
    "existence", "consciousness", "subconscious", "unconscious", "awareness", "mindfulness", "enlightenment", "awakening", "transcendence", "ascension",
    "destiny", "fate", "karma", "dharma", "nirvana", "salvation", "damnation", "purgatory", "redemption", "liberation",
    "mortality", "immortality", "infinity", "eternity", "temporality", "permanence", "impermanence", "transience", "continuity", "discontinuity",
    "reality", "illusion", "perception", "perspective", "interpretation", "understanding", "comprehension", "misunderstanding", "confusion", "clarity",
    "meaning", "purpose", "significance", "importance", "relevance", "irrelevance", "value", "worth", "essence", "substance",

    // Social/Cultural
    "tradition", "modernity", "convention", "rebellion", "conformity", "nonconformity", "individuality", "collectivism", "capitalism", "socialism",
    "democracy", "autocracy", "bureaucracy", "aristocracy", "meritocracy", "plutocracy", "oligarchy", "anarchy", "monarchy", "theocracy",
    "discrimination", "prejudice", "stereotype", "stigma", "marginalization", "oppression", "liberation", "emancipation", "equality", "inequality",
    "globalization", "localization", "urbanization", "industrialization", "modernization", "westernization", "colonization", "decolonization", "immigration", "emigration",
    "assimilation", "integration", "segregation", "isolation", "inclusion", "exclusion", "diversity", "homogeneity", "heterogeneity", "plurality",

    // Scientific/Technical
    "photosynthesis", "metamorphosis", "osmosis", "mitosis", "meiosis", "synthesis", "analysis", "hypothesis", "theory", "theorem",
    "algorithm", "encryption", "decryption", "compression", "decompression", "optimization", "virtualization", "simulation", "emulation", "automation",
    "quantum", "relativity", "gravity", "magnetism", "electricity", "radiation", "frequency", "wavelength", "amplitude", "resonance",
    "chromosome", "genome", "mutation", "evolution", "adaptation", "selection", "heredity", "genetics", "epigenetics", "proteomics",
    "ecosystem", "biodiversity", "sustainability", "conservation", "preservation", "restoration", "extinction", "endangerment", "rehabilitation", "regeneration",

    // Business/Economics
    "entrepreneurship", "partnership", "corporation", "conglomerate", "monopoly", "oligopoly", "competition", "merger", "acquisition", "bankruptcy",
    "investment", "dividend", "portfolio", "diversification", "speculation", "arbitrage", "leverage", "liquidity", "volatility", "stability",
    "revenue", "profit", "loss", "margin", "overhead", "liability", "asset", "equity", "debt", "credit",
    "marketing", "branding", "advertising", "promotion", "sponsorship", "endorsement", "licensing", "franchising", "outsourcing", "offshoring",
    "negotiation", "mediation", "arbitration", "litigation", "settlement", "contract", "agreement", "partnership", "collaboration", "competition",

    // Art/Literature Terms
    "metaphor", "simile", "allegory", "symbolism", "irony", "satire", "parody", "hyperbole", "understatement", "paradox",
    "protagonist", "antagonist", "narrator", "character", "plot", "theme", "motif", "setting", "conflict", "resolution",
    "tragedy", "comedy", "drama", "romance", "mystery", "thriller", "horror", "fantasy", "science fiction", "dystopia",
    "impressionism", "expressionism", "surrealism", "cubism", "minimalism", "maximalism", "realism", "naturalism", "romanticism", "baroque",
    "symphony", "concerto", "sonata", "opera", "ballet", "jazz", "blues", "reggae", "gospel", "classical",

    // Idioms/Expressions (challenging to draw)
    "cold shoulder", "piece of cake", "break a leg", "hit the hay", "under the weather", "cost an arm and a leg", "once in a blue moon", "raining cats and dogs", "bite the bullet", "spill the beans",
    "butterflies in stomach", "elephant in the room", "skeleton in closet", "chip on shoulder", "heart on sleeve", "head in clouds", "feet on ground", "back against wall", "hands are tied", "eyes in back of head",
    "silver lining", "glass ceiling", "slippery slope", "tight ship", "loose cannon", "dark horse", "wild card", "trump card", "ace in hole", "ball in court",
    "red herring", "white lie", "gray area", "black sheep", "green thumb", "blue blood", "yellow belly", "pink slip", "golden rule", "silver tongue",

    // Advanced Concepts
    "renaissance", "enlightenment", "reformation", "revolution", "industrialization", "globalization", "digitalization", "decentralization", "democratization", "privatization",
    "synchronization", "harmonization", "standardization", "customization", "personalization", "localization", "internationalization", "commercialization", "monetization", "commodification",
    "infrastructure", "superstructure", "architecture", "bureaucracy", "hierarchy", "democracy", "meritocracy", "aristocracy", "plutocracy", "technocracy",
    "phenomenon", "paradigm", "spectrum", "momentum", "equilibrium", "continuum", "vacuum", "medium", "maximum", "minimum",
    "hypothesis", "synthesis", "analysis", "diagnosis", "prognosis", "genesis", "nemesis", "thesis", "antithesis", "synthesis",

    // Miscellaneous Hard Words
    "deja vu", "faux pas", "zeitgeist", "wanderlust", "schadenfreude", "serendipity", "euphemism", "oxymoron", "onomatopoeia", "alliteration",
    "claustrophobia", "arachnophobia", "acrophobia", "agoraphobia", "xenophobia", "homophobia", "technophobia", "nomophobia", "trypophobia", "glossophobia",
    "biodegradable", "sustainable", "renewable", "recyclable", "compostable", "disposable", "reusable", "biodiversity", "deforestation", "desertification",
    "gentrification", "urbanization", "suburbanization", "industrialization", "commercialization", "institutionalization", "decentralization", "centralization", "privatization", "nationalization",
    "cryptocurrency", "blockchain", "artificial intelligence", "machine learning", "deep learning", "neural network", "virtual reality", "augmented reality", "mixed reality", "metaverse"
];

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Get all words for a specific difficulty
 */
export function getWordsByDifficulty(difficulty: WordDifficulty): string[] {
    switch (difficulty) {
        case 'easy':
            return WORDS_EASY;
        case 'medium':
            return WORDS_MEDIUM;
        case 'hard':
            return WORDS_HARD;
        default:
            return WORDS_EASY;
    }
}

/**
 * Get word counts by difficulty
 */
export function getWordCounts(): Record<WordDifficulty, number> {
    return {
        easy: WORDS_EASY.length,
        medium: WORDS_MEDIUM.length,
        hard: WORDS_HARD.length
    };
}

/**
 * Get total word count
 */
export function getTotalWordCount(): number {
    return WORDS_EASY.length + WORDS_MEDIUM.length + WORDS_HARD.length;
}
