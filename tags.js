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
    ]
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
