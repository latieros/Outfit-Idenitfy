// Danbooru-style tag vocabulary used to steer the model and to classify its output.
// Tags use danbooru spelling (underscores). The interpreter marks a returned tag as
// "canonical" when it appears here, and "custom" otherwise. Extend freely.
window.OUTFIT_TAGS = {
  categories: [
    "tops", "bottoms", "dresses", "outerwear", "footwear", "legwear",
    "headwear", "eyewear", "neckwear", "handwear", "accessories", "bags",
    "underwear_swimwear", "uniforms_costumes", "hair", "eyes", "body",
    "patterns", "materials", "colors", "style", "pose_framing"
  ],
  // Scene groups (Danbooru tag groups beyond attire): read when the user asks for the whole picture.
  sceneCategories: ["background", "composition", "lighting", "color_theme", "visual_aesthetic"],

  vocab: {
    tops: [
      "shirt", "t-shirt", "white_shirt", "black_shirt", "collared_shirt", "dress_shirt",
      "blouse", "sailor_collar", "crop_top", "tank_top", "camisole", "halterneck",
      "tube_top", "turtleneck", "sweater", "ribbed_sweater", "sweater_vest", "cardigan",
      "hoodie", "sweatshirt", "polo_shirt", "button_up", "off-shoulder_shirt",
      "sleeveless_shirt", "long_sleeves", "short_sleeves", "puffy_sleeves",
      "puffy_short_sleeves", "detached_sleeves", "wide_sleeves", "sleeves_rolled_up",
      "bare_shoulders", "midriff", "cleavage", "plunging_neckline", "v-neck",
      "frilled_shirt", "striped_shirt", "plaid_shirt", "print_shirt", "vest",
      "corset", "bustier", "bodysuit", "leotard", "sports_bra", "tied_shirt",
      "shirt_tucked_in", "untucked_shirt", "open_shirt", "partially_unbuttoned"
    ],
    bottoms: [
      "skirt", "pleated_skirt", "miniskirt", "long_skirt", "pencil_skirt", "high-waist_skirt",
      "plaid_skirt", "frilled_skirt", "layered_skirt", "denim_skirt", "side_slit",
      "pants", "jeans", "denim", "shorts", "short_shorts", "denim_shorts", "bike_shorts",
      "cargo_pants", "sweatpants", "track_pants", "leggings", "yoga_pants", "capri_pants",
      "wide-leg_pants", "high-waist_pants", "pleated_pants", "dress_pants", "hakama",
      "overalls", "suspenders", "belt", "chain_belt", "pantyhose_under_shorts"
    ],
    dresses: [
      "dress", "sundress", "long_dress", "short_dress", "sleeveless_dress", "strapless_dress",
      "off-shoulder_dress", "halter_dress", "pinafore_dress", "sailor_dress", "sweater_dress",
      "slip_dress", "cocktail_dress", "evening_gown", "ball_gown", "wedding_dress",
      "china_dress", "cheongsam", "kimono", "yukata", "furisode", "hanbok", "ao_dai",
      "lolita_fashion", "gothic_lolita", "frilled_dress", "layered_dress", "pleated_dress",
      "polka_dot_dress", "floral_dress", "striped_dress", "backless_dress", "see-through_dress",
      "jumpsuit", "romper", "robe", "nightgown", "apron", "maid_apron"
    ],
    outerwear: [
      "jacket", "blazer", "suit_jacket", "bomber_jacket", "leather_jacket", "denim_jacket",
      "track_jacket", "puffer_jacket", "varsity_jacket", "cropped_jacket", "open_jacket",
      "jacket_on_shoulders", "coat", "trench_coat", "long_coat", "peacoat", "duffel_coat",
      "fur_coat", "fur_trim", "winter_coat", "raincoat", "cape", "cloak", "poncho", "shawl",
      "haori", "lab_coat", "military_jacket", "hooded_jacket", "windbreaker", "parka",
      "sleeveless_jacket", "vest", "waistcoat"
    ],
    footwear: [
      "shoes", "sneakers", "high_heels", "boots", "knee_boots", "thigh_boots", "ankle_boots",
      "combat_boots", "platform_boots", "platform_footwear", "loafers", "mary_janes",
      "oxford_shoes", "sandals", "flip-flops", "slippers", "geta", "zouri", "pumps",
      "stiletto_heels", "wedge_heels", "ballet_flats", "flats", "uwabaki", "rubber_boots",
      "cowboy_boots", "white_footwear", "black_footwear", "brown_footwear", "red_footwear",
      "barefoot", "shoe_soles"
    ],
    legwear: [
      "thighhighs", "kneehighs", "socks", "ankle_socks", "loose_socks", "pantyhose", "tights",
      "black_pantyhose", "white_pantyhose", "fishnets", "fishnet_pantyhose", "garter_straps",
      "garter_belt", "striped_thighhighs", "striped_legwear", "black_thighhighs",
      "white_thighhighs", "lace-trimmed_legwear", "frilled_legwear", "leg_warmers",
      "toeless_legwear", "single_thighhigh", "mismatched_legwear", "over-kneehighs",
      "bare_legs"
    ],
    headwear: [
      "hat", "beret", "beanie", "baseball_cap", "flat_cap", "cabbie_hat", "bucket_hat",
      "sun_hat", "straw_hat", "witch_hat", "top_hat", "fedora", "cowboy_hat", "bowler_hat",
      "peaked_cap", "garrison_cap", "sailor_hat", "nurse_cap", "chef_hat", "helmet",
      "hood", "hood_up", "hood_down", "headband", "hairband", "hair_ribbon", "hair_bow",
      "hair_ornament", "hairclip", "hair_flower", "hair_scrunchie", "hairpin",
      "headdress", "maid_headdress", "tiara", "crown", "veil", "bandana", "headscarf",
      "hijab", "visor_cap", "earmuffs", "headphones", "halo", "animal_ears_headwear"
    ],
    eyewear: [
      "glasses", "round_eyewear", "semi-rimless_eyewear", "rimless_eyewear", "black-framed_eyewear",
      "red-framed_eyewear", "sunglasses", "tinted_eyewear", "eyewear_on_head", "monocle",
      "goggles", "goggles_on_head", "eyepatch", "aviator_sunglasses"
    ],
    neckwear: [
      "necktie", "red_necktie", "black_necktie", "bowtie", "red_bowtie", "ribbon", "neck_ribbon",
      "neckerchief", "red_neckerchief", "scarf", "plaid_scarf", "choker", "black_choker",
      "collar", "detached_collar", "necklace", "pendant", "cross_necklace", "pearl_necklace",
      "jewelry", "ascot", "cravat", "bolo_tie", "bandana_around_neck", "lanyard", "neck_bell"
    ],
    handwear: [
      "gloves", "white_gloves", "black_gloves", "fingerless_gloves", "elbow_gloves",
      "long_gloves", "lace_gloves", "leather_gloves", "half_gloves", "mittens",
      "wrist_cuffs", "bracelet", "bangle", "wristband", "watch", "wristwatch", "ring",
      "nail_polish", "arm_warmers", "armband", "sleeve_garter"
    ],
    accessories: [
      "earrings", "hoop_earrings", "stud_earrings", "piercing", "ear_piercing",
      "brooch", "badge", "pin", "armband", "belt", "belt_buckle", "chain", "ribbon",
      "bow", "sash", "obi", "pocket_watch", "umbrella", "parasol", "fan", "folding_fan",
      "flower", "feather", "mask", "mouth_mask", "surgical_mask", "gas_mask",
      "id_card", "name_tag", "anklet", "tattoo", "wings"
    ],
    bags: [
      "bag", "handbag", "shoulder_bag", "backpack", "randoseru", "school_bag", "messenger_bag",
      "tote_bag", "clutch_bag", "duffel_bag", "satchel", "fanny_pack", "pouch", "briefcase",
      "suitcase", "basket"
    ],
    underwear_swimwear: [
      "bra", "panties", "lingerie", "babydoll", "bikini", "one-piece_swimsuit", "swimsuit",
      "school_swimsuit", "competition_swimsuit", "bikini_top", "bikini_bottom",
      "sarong", "swim_trunks", "wetsuit", "rash_guard"
    ],
    uniforms_costumes: [
      "school_uniform", "serafuku", "blazer_uniform", "gakuran", "gym_uniform",
      "track_suit", "sportswear", "cheerleader", "maid", "nurse", "police_uniform",
      "military_uniform", "suit", "formal", "business_suit", "pant_suit", "tuxedo",
      "waitress", "chef", "miko", "nun", "priestess", "shrine_maiden", "santa_costume",
      "witch", "pirate", "cowboy_western", "idol", "stage_costume", "race_queen",
      "pajamas", "sleepwear", "hospital_gown", "armor", "bikini_armor", "plugsuit",
      "mecha_musume", "magical_girl", "cosplay", "streetwear", "techwear", "casual"
    ],
    hair: [
      "short_hair", "very_short_hair", "medium_hair", "long_hair", "very_long_hair",
      "absurdly_long_hair", "bob_cut", "pixie_cut", "hime_cut", "wolf_cut", "undercut",
      "ponytail", "high_ponytail", "low_ponytail", "side_ponytail", "twintails",
      "low_twintails", "braid", "single_braid", "twin_braids", "french_braid", "crown_braid",
      "braided_ponytail", "hair_bun", "double_bun", "single_hair_bun", "drill_hair",
      "wavy_hair", "curly_hair", "straight_hair", "messy_hair", "spiked_hair",
      "hair_over_one_eye", "blunt_bangs", "swept_bangs", "parted_bangs", "side_bangs",
      "asymmetrical_bangs", "ahoge", "sidelocks", "hair_intakes", "hair_between_eyes",
      "black_hair", "brown_hair", "blonde_hair", "white_hair", "silver_hair", "grey_hair",
      "red_hair", "orange_hair", "pink_hair", "purple_hair", "blue_hair", "light_blue_hair",
      "green_hair", "aqua_hair", "multicolored_hair", "two-tone_hair", "gradient_hair",
      "streaked_hair", "colored_inner_hair", "dyed_bangs"
    ],
    eyes: [
      "blue_eyes", "red_eyes", "green_eyes", "brown_eyes", "black_eyes", "purple_eyes",
      "yellow_eyes", "orange_eyes", "pink_eyes", "aqua_eyes", "grey_eyes", "heterochromia",
      "closed_eyes", "one_eye_closed", "glowing_eyes", "slit_pupils", "eyeshadow", "eyeliner",
      "makeup", "lipstick", "red_lips", "blush", "freckles", "mole", "mole_under_eye"
    ],
    body: [
      "1girl", "1boy", "2girls", "2boys", "1other", "multiple_girls", "multiple_boys",
      "solo", "androgynous", "muscular", "muscular_female", "slim", "petite", "curvy",
      "plump", "tall", "short", "mature_female", "mature_male", "old_man", "old_woman",
      "child", "teenage", "dark_skin", "dark-skinned_female", "dark-skinned_male",
      "pale_skin", "tan", "tanlines", "abs", "toned", "thick_thighs", "wide_hips",
      "narrow_waist", "flat_chest", "small_breasts", "medium_breasts", "large_breasts",
      "beard", "mustache", "stubble", "facial_hair", "scar", "bandages"
    ],
    patterns: [
      "plaid", "tartan", "striped", "vertical_stripes", "horizontal_stripes", "pinstripe_pattern",
      "polka_dot", "floral_print", "animal_print", "leopard_print", "zebra_print", "camouflage",
      "argyle", "checkered", "gingham", "houndstooth", "paisley", "tie-dye", "gradient",
      "print_shirt", "logo", "text_print", "star_print", "heart_print", "skull_print",
      "cat_print", "snowflake_print", "lace", "lace_trim", "frills", "ruffles", "embroidery",
      "sequins", "glitter", "studded", "zipper", "buttons", "double-breasted",
      "single-breasted", "pleated", "torn_clothes", "distressed", "two-tone", "multicolored_clothes"
    ],
    materials: [
      "denim", "leather", "latex", "vinyl", "pvc", "silk", "satin", "velvet", "velour",
      "lace", "chiffon", "tulle", "organza", "cotton", "linen", "wool", "cashmere", "fleece",
      "fur", "faux_fur", "fur_trim", "knit", "ribbed", "cable_knit", "mesh", "fishnet",
      "see-through", "sheer", "transparent", "metallic", "sequined", "spandex", "nylon",
      "corduroy", "tweed", "canvas", "rubber", "plastic", "armor", "plate_armor", "chainmail"
    ],
    colors: [
      "white", "black", "grey", "red", "pink", "orange", "yellow", "green", "blue",
      "light_blue", "navy", "purple", "lavender", "brown", "beige", "cream", "tan",
      "gold", "silver", "bronze", "aqua", "teal", "olive", "maroon", "burgundy", "coral",
      "mint", "pastel_colors", "monochrome", "dark", "bright"
    ],
    style: [
      "casual", "formal", "streetwear", "techwear", "gothic", "gothic_lolita", "lolita_fashion",
      "punk", "cyberpunk", "steampunk", "retro", "vintage", "y2k", "grunge", "preppy",
      "bohemian", "minimalist", "athleisure", "sportswear", "business_casual", "office_lady",
      "gyaru", "kogal", "harajuku", "fairy_kei", "decora", "visual_kei", "military",
      "fantasy", "sci-fi", "traditional_clothes", "japanese_clothes", "chinese_clothes",
      "korean_clothes", "western", "cottagecore", "dark_academia", "light_academia",
      "egirl", "softgirl", "kawaii", "elegant", "cute", "cool", "sexy", "modest"
    ],
    pose_framing: [
      "full_body", "upper_body", "cowboy_shot", "portrait", "close-up", "from_behind",
      "from_side", "from_above", "from_below", "standing", "sitting", "walking", "running",
      "kneeling", "lying", "leaning", "hands_in_pockets", "hand_on_hip", "arms_crossed",
      "looking_at_viewer", "looking_away", "looking_back", "smile", "serious", "dynamic_pose",
      "contrapposto", "outdoors", "indoors", "simple_background", "white_background",
      "street", "city", "night", "day", "photo_background", "realistic", "photorealistic",
      "anime_style", "illustration"
    ],
    background: [
      "simple_background", "white_background", "black_background", "grey_background", "gradient_background",
      "transparent_background", "blurry_background", "photo_background", "outdoors", "indoors", "street", "city",
      "cityscape", "rooftop", "alley", "classroom", "hallway", "bedroom", "living_room", "kitchen", "bathroom",
      "library", "cafe", "restaurant", "shop", "train_station", "train_interior", "bus_interior", "car_interior",
      "office", "hospital", "shrine", "temple", "church", "castle", "ruins", "beach", "ocean", "lake", "river",
      "waterfall", "pool", "poolside", "forest", "bamboo_forest", "garden", "field", "flower_field", "wheat_field",
      "meadow", "mountain", "cliff", "desert", "snow", "sky", "cloudy_sky", "night_sky", "starry_sky", "sunset",
      "sunrise", "rain", "fog", "underwater", "space", "stage", "concert", "festival", "amusement_park",
      "park", "playground", "school", "gym", "locker_room", "onsen", "bath", "window", "curtains", "bed",
      "couch", "chair", "desk", "table", "shelf", "bookshelf", "wall", "brick_wall", "fence", "road",
      "crosswalk", "bridge", "stairs", "lamppost", "neon_lights", "sign", "graffiti", "tree", "cherry_blossoms",
      "autumn_leaves", "petals", "falling_petals", "flowers", "grass", "plant", "potted_plant", "balloon",
      "confetti", "sparkles", "bubbles", "light_particles", "lens_flare", "christmas_tree", "umbrella_(background)"
    ],
    composition: [
      "full_body", "upper_body", "cowboy_shot", "portrait", "close-up", "face", "wide_shot", "very_wide_shot",
      "feet_out_of_frame", "head_out_of_frame", "out_of_frame", "cropped_legs", "cropped_torso",
      "from_above", "from_below", "from_side", "from_behind", "straight-on", "dutch_angle", "dynamic_angle",
      "fisheye", "foreshortening", "perspective", "vanishing_point", "pov", "first-person_view",
      "depth_of_field", "bokeh", "motion_blur", "motion_lines", "speed_lines", "letterboxed", "pillarboxed",
      "border", "rounded_corners", "symmetry", "asymmetrical", "rule_of_thirds", "centered", "off-center",
      "negative_space", "silhouette", "reflection", "mirror", "through_window", "split_screen", "multiple_views",
      "zoom_layer", "close-up_inset", "panel_layout", "comic", "4koma", "diptych", "triptych", "looking_at_viewer",
      "looking_away", "looking_back", "looking_to_the_side", "looking_down", "looking_up", "eye_contact",
      "standing", "sitting", "walking", "running", "kneeling", "lying", "leaning", "leaning_forward",
      "dynamic_pose", "contrapposto", "action_pose", "jumping", "floating", "flying"
    ],
    lighting: [
      "backlighting", "rim_lighting", "sidelighting", "front_lighting", "top_lighting", "underlighting",
      "soft_lighting", "hard_lighting", "dramatic_lighting", "cinematic_lighting", "natural_lighting",
      "sunlight", "dappled_sunlight", "moonlight", "lamplight", "candlelight", "neon_lighting", "stage_lights",
      "spotlight", "glowing", "glow", "light_rays", "sunbeam", "god_rays", "caustics", "lens_flare", "bloom",
      "shadow", "shaded_face", "cast_shadow", "volumetric_lighting", "chiaroscuro", "high_contrast",
      "low_contrast", "overexposure", "underexposure", "bright", "dim", "dark", "night", "day", "evening",
      "golden_hour", "blue_hour", "twilight", "dusk", "dawn", "overcast", "silhouette", "reflective_light"
    ],
    color_theme: [
      "monochrome", "greyscale", "sepia", "limited_palette", "partially_colored", "spot_color", "duotone",
      "two-tone", "pastel_colors", "muted_colors", "vivid_colors", "saturated", "desaturated", "high_contrast",
      "low_contrast", "warm_colors", "cool_colors", "warm_tones", "cool_tones", "neon_palette", "earth_tones",
      "pink_theme", "red_theme", "orange_theme", "yellow_theme", "green_theme", "blue_theme", "purple_theme",
      "black_theme", "white_theme", "brown_theme", "aqua_theme", "gradient", "rainbow", "iridescent",
      "color_contrast", "complementary_colors", "analogous_colors", "triadic_colors", "dark_palette",
      "light_palette", "film_grain", "chromatic_aberration", "color_halftone", "glitch", "halftone"
    ],
    visual_aesthetic: [
      "anime_screencap", "anime_coloring", "flat_color", "cel_shading", "soft_shading", "painterly",
      "impressionism", "watercolor_(medium)", "oil_painting_(medium)", "acrylic_paint_(medium)", "marker_(medium)",
      "colored_pencil_(medium)", "graphite_(medium)", "ink_(medium)", "sketch", "lineart", "no_lineart",
      "thick_lineart", "thin_lineart", "monochrome_lineart", "pixel_art", "1990s_(style)", "1980s_(style)",
      "2000s_(style)", "retro_artstyle", "ligne_claire", "art_nouveau", "art_deco", "ukiyo-e", "sumi-e",
      "nihonga", "pop_art", "vaporwave", "synthwave", "cyberpunk", "dieselpunk", "steampunk", "lofi",
      "dreamy", "ethereal", "surreal", "abstract", "minimalism", "maximalism", "collage", "mixed_media",
      "photorealistic", "realistic", "semi-realistic", "3d", "chibi", "cute", "kawaii", "dark", "gloomy",
      "horror", "eerie", "whimsical", "nostalgic", "melancholy", "serene", "cozy", "fashion_illustration",
      "magazine_cover", "poster_(medium)", "album_cover", "postcard", "polaroid", "film_photography",
      "cinematic", "screenshot", "traditional_media", "digital_media", "shikishi"
    ]
  },

  // Common misspellings and non-canonical spellings -> Danbooru canonical tag.
  aliases: {
    thigh_highs: "thighhighs", thigh_high_socks: "thighhighs", thighhigh: "thighhighs", knee_highs: "kneehighs", knee_high_socks: "kneehighs",
    tshirt: "t-shirt", t_shirt: "t-shirt", tee: "t-shirt", tee_shirt: "t-shirt", hoody: "hoodie", sweat_shirt: "sweatshirt", jumper: "sweater",
    trousers: "pants", slacks: "dress_pants", denim_jeans: "jeans", skinny_jeans: "jeans", mini_skirt: "miniskirt", skirt_pleated: "pleated_skirt",
    high_heel: "high_heels", heels: "high_heels", stilettos: "stiletto_heels", trainers: "sneakers", running_shoes: "sneakers", tennis_shoes: "sneakers",
    sun_glasses: "sunglasses", eyeglasses: "glasses", spectacles: "glasses", neck_tie: "necktie", tie: "necktie", bow_tie: "bowtie",
    hair_band: "hairband", head_band: "headband", hair_clip: "hairclip", hair_tie: "hair_scrunchie", scrunchie: "hair_scrunchie",
    pony_tail: "ponytail", twin_tails: "twintails", pig_tails: "twintails", twin_braids: "twin_braids", bun: "hair_bun", space_buns: "double_bun",
    fringe: "bangs", blond_hair: "blonde_hair", gray_hair: "grey_hair", gray_eyes: "grey_eyes", silver_eyes: "grey_eyes", violet_eyes: "purple_eyes",
    leather_jacket_black: "leather_jacket", jean_jacket: "denim_jacket", puffer_coat: "puffer_jacket", overcoat: "coat", trenchcoat: "trench_coat",
    sailor_uniform: "serafuku", sailor_fuku: "serafuku", seifuku: "serafuku", school_girl_uniform: "school_uniform", gym_clothes: "gym_uniform",
    maid_outfit: "maid", maid_dress: "maid", nurse_outfit: "nurse", witch_outfit: "witch", one_piece: "one-piece_swimsuit", swimwear: "swimsuit",
    crop_tee: "crop_top", cropped_top: "crop_top", tanktop: "tank_top", cami: "camisole", button_down: "button_up", button_up_shirt: "button_up",
    off_shoulder: "off-shoulder_shirt", off_the_shoulder: "off-shoulder_shirt", cold_shoulder: "off-shoulder_shirt", long_sleeve: "long_sleeves",
    short_sleeve: "short_sleeves", sleeveless_top: "sleeveless_shirt", fingerless_glove: "fingerless_gloves", elbow_length_gloves: "elbow_gloves",
    handbag_bag: "handbag", purse: "handbag", rucksack: "backpack", book_bag: "school_bag", hand_bag: "handbag",
    plaid_pattern: "plaid", striped_pattern: "striped", stripes: "striped", polka_dots: "polka_dot", polkadot: "polka_dot", floral: "floral_print",
    flower_print: "floral_print", leopard: "leopard_print", camo: "camouflage", checkerboard: "checkered", check_pattern: "checkered",
    denim_fabric: "denim", lace_fabric: "lace", seethrough: "see-through", see_through: "see-through", sheer_fabric: "sheer",
    full_body_shot: "full_body", upper_body_shot: "upper_body", waist_up: "upper_body", knees_up: "cowboy_shot", looking_at_camera: "looking_at_viewer",
    "1_girl": "1girl", one_girl: "1girl", girl: "1girl", woman: "1girl", "1_boy": "1boy", one_boy: "1boy", boy: "1boy", man: "1boy", female: "1girl", male: "1boy"
  },
  canonicalize(tag) {
    const n = this.normalize(tag);
    return this.aliases[n] || n;
  },

  // Helpers --------------------------------------------------------------
  all() {
    const s = new Set();
    for (const list of Object.values(this.vocab)) list.forEach(t => s.add(t));
    return s;
  },
  normalize(tag) {
    return String(tag || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  },
  isCanonical(tag) {
    if (!this._all) this._all = this.all();
    return this._all.has(this.normalize(tag));
  },
  categoryOf(tag) {
    const n = this.normalize(tag);
    for (const [cat, list] of Object.entries(this.vocab)) if (list.includes(n)) return cat;
    return null;
  },
  // Compact text version for the model prompt.
  promptText() {
    return Object.entries(this.vocab)
      .map(([cat, list]) => `${cat}: ${list.join(", ")}`)
      .join("\n");
  }
};
