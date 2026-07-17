/*
  facts.js
  Real, kid-appropriate Guyana trivia. `FACTS[i]` corresponds to level index i (0-9).
  Each entry has a pool of `intro` facts (one is picked at random each time the
  level starts) and a larger pool of `bonus` facts (game.js shuffles this pool
  per playthrough and reveals one per hidden culture gem, so the 3 gems in a
  level show 3 different facts each time you play it).
*/

const FACTS = [
  { // Level 1 - Stabroek Market & Sea Wall
    intro: [
      "Georgetown, Guyana's capital, sits below sea level and is protected by a Sea Wall built by the Dutch centuries ago!",
      "Georgetown was founded in 1781 and blends Dutch, French, and British colonial history in its streets and buildings.",
    ],
    bonus: [
      "Stabroek Market's iconic clock tower has been a Georgetown landmark since 1881.",
      "Guyana's flag is nicknamed 'The Golden Arrowhead' for its bold gold triangle.",
      "Georgetown was once laid out with canals, earning it the nickname 'Garden City of the Caribbean'.",
      "St. George's Cathedral in Georgetown is one of the tallest wooden buildings in the world.",
      "Georgetown's canals and kokers (sluice gates) drain water from the city, a system first engineered by the Dutch.",
      "Stabroek Market has sold fresh produce, fish, and handmade crafts since the 1880s.",
    ]
  },
  { // Level 2 - Demerara Riverside
    intro: [
      "The Demerara River stretches for about 346 km (215 miles) and gave its name to Demerara sugar!",
      "The Demerara Harbour Bridge crossing the river was once one of the longest floating bridges on Earth.",
    ],
    bonus: [
      "Sugar cane has been grown along the Demerara River since the 1700s.",
      "The Demerara Harbour Bridge was once one of the longest floating bridges in the world.",
      "Guyana's rivers were the main highways before roads connected the interior.",
      "Demerara sugar gets its name from the sugar plantations that once lined this very river.",
      "Fishing boats and sugar barges still travel the Demerara River every day.",
      "The Demerara River flows north for over 346 km before reaching the Atlantic Ocean at Georgetown.",
    ]
  },
  { // Level 3 - Essequibo Mangroves
    intro: [
      "The mighty Essequibo River drains nearly 70% of Guyana and is the largest river in the country!",
      "The Essequibo River is so wide near its mouth that you can barely see the far shore.",
    ],
    bonus: [
      "Mangrove roots along the Essequibo protect the coastline from erosion.",
      "The Essequibo is dotted with hundreds of small islands, some larger than entire nations!",
      "Guyana's mangroves are home to crabs, fish, and nesting birds found nowhere else nearby.",
      "Mangrove forests like these are natural nurseries for young fish and shrimp.",
      "The Essequibo River is home to hundreds of islands, some big enough to have their own villages.",
      "Guyana has been planting new mangrove trees along its coast to help protect against rising seas.",
    ]
  },
  { // Level 4 - Iwokrama Rainforest Canopy
    intro: [
      "The Iwokrama Forest protects nearly 4,000 sq km of pristine rainforest for conservation and research.",
      "Iwokrama means 'place of the shining water' and protects one of the last untouched rainforests on Earth.",
    ],
    bonus: [
      "Iwokrama's canopy walkway lets visitors walk high above the forest floor among the treetops.",
      "Guyana is one of the most forested countries on Earth — over 80% is covered in rainforest.",
      "The forest is home to jaguars, giant otters, and the world's largest eagle, the harpy eagle.",
      "Iwokrama's canopy walkway rises over 30 meters above the forest floor.",
      "Scientists come from all over the world to study Iwokrama's rare plants and animals.",
      "The rainforest canopy is so thick in places that sunlight barely reaches the ground.",
    ]
  },
  { // Level 5 - Kaieteur Falls
    intro: [
      "Kaieteur Falls plunges about 226 meters (741 feet) in a single drop — nearly five times taller than Niagara Falls!",
      "Kaieteur Falls sits inside Kaieteur National Park, one of the oldest protected rainforests in the world.",
    ],
    bonus: [
      "Kaieteur is one of the world's most powerful single-drop waterfalls by volume of water.",
      "The falls are named after a legendary Patamona chief named Kaie.",
      "Golden frogs live in the giant tank bromeliads that grow near Kaieteur's mist.",
      "The mist from Kaieteur Falls can be felt hundreds of meters away.",
      "Kaieteur is fed by the Potaro River, a tributary of the Essequibo.",
      "You can hike or fly by small plane to reach Kaieteur Falls, deep in Guyana's interior.",
    ]
  },
  { // Level 6 - Rupununi Savannah
    intro: [
      "The Rupununi Savannah covers about 15,000 square kilometers of open grassland in southern Guyana.",
      "The Rupununi is split into North and South savannahs by the Kanuku Mountains.",
    ],
    bonus: [
      "Giant anteaters and giant river otters both roam the Rupununi wetlands.",
      "Jaguars, the largest cats in the Americas, still prowl Guyana's forests and savannahs.",
      "Fireflies light up Rupununi nights like tiny floating lanterns.",
      "Ranchers on horseback, called vaqueros, still herd cattle across the Rupununi today.",
      "The Rupununi floods every year, turning grassland into wetlands full of fish and birds.",
      "Giant river otters, found in the Rupununi's rivers, can grow up to 1.8 meters long.",
    ]
  },
  { // Level 7 - Pork-Knocker Trail
    intro: [
      "'Pork-knockers' are Guyana's traditional small-scale gold and diamond miners who work the interior trails.",
      "Pork-knockers often work for weeks deep in the bush before returning to sell what they've found.",
    ],
    bonus: [
      "The name 'pork-knocker' comes from miners once trading salted pork along the trails.",
      "Guyana has been a source of gold and diamonds since the 1800s.",
      "Many pork-knocker trails follow old rivers and creeks deep into the interior.",
      "Gold mining has been part of Guyana's economy since the 19th century.",
      "Some pork-knockers pan for gold by hand in rivers, just like miners did over a century ago.",
      "Guyana is one of South America's top gold-producing countries.",
    ]
  },
  { // Level 8 - Bush Camp Clearing
    intro: [
      "Interior travelers set up 'bush camps' with hammocks strung between trees for the night.",
      "A bush camp is often just a tarpaulin, a fire pit, and hammocks strung between trees.",
    ],
    bonus: [
      "Hammocks, first used by Indigenous peoples, are still the go-to bed in Guyana's interior.",
      "Guyana is home to nine Indigenous peoples, each with their own language and traditions.",
      "Cassava bread, made from the cassava root, is a staple food cooked at many bush camps.",
      "Cassava, a root vegetable, is a staple food across Guyana's interior communities.",
      "Indigenous guides can identify hundreds of plants used for food and medicine in the forest.",
      "Campfires in the bush are used for cooking, light, and keeping curious animals away.",
    ]
  },
  { // Level 9 - Shell Beach
    intro: [
      "Shell Beach is a vital nesting site where four species of sea turtles lay their eggs, including giant leatherbacks.",
      "Shell Beach stretches for about 145 km along Guyana's northwest coast.",
    ],
    bonus: [
      "Leatherback turtles can grow larger than a bathtub and swim thousands of miles across the ocean.",
      "Conservationists and local communities patrol Shell Beach together to protect turtle nests.",
      "Baby turtles, called hatchlings, use the moonlight over the ocean to find their way to the water.",
      "Four sea turtle species nest at Shell Beach: leatherback, green, hawksbill, and olive ridley.",
      "A mother turtle can lay over 80 eggs in a single nest.",
      "Local rangers patrol Shell Beach at night to protect nesting turtles from poachers.",
    ]
  },
  { // Level 10 - Kanuku Mountains Trail
    intro: [
      "The Kanuku Mountains are considered one of the most biodiverse protected areas on the planet.",
      "The Kanuku Mountains are considered a 'rainforest island' rising out of the surrounding savannah.",
    ],
    bonus: [
      "Kanuku is a Wapishana word, and the mountains are sacred to local Indigenous communities.",
      "Scientists have recorded over 400 bird species in the Kanuku Mountains.",
      "The Kanukus form a rugged, forested wall rising straight out of the Rupununi Savannah.",
      "The Kanuku Mountains have never had major roads built through them, keeping them wild.",
      "Harpy eagles, one of the world's largest and most powerful eagles, nest in the Kanukus.",
      "Conservationists consider the Kanuku Mountains one of the most important protected areas in South America.",
    ]
  }
];

const BOSS_FACTS = [
  [
    "Ole Higue is a shape-shifting figure from Guyanese folklore said to shed her skin at night — leave salt or rice by the door and she'll have to stop and count every grain!",
    "In Guyanese folklore, Ole Higue is said to fly as a ball of fire at night after shedding her skin — kept out by sprinkling salt on her hidden skin.",
  ],
  [
    "Massacooraman is a legendary river giant said to guard Guyana's waterways and stir up the water when boats get too bold.",
    "Stories describe Massacooraman as a huge, hairy river spirit strong enough to capsize a boat with a single splash.",
  ],
  [
    "Moongazers are tall misty figures from folklore said to stand silently at crossroads, staring up at the moon.",
    "Folklore says a Moongazer is so tall you could walk right between its legs without it ever looking down at you.",
  ],
  [
    "Baccoo is a small, mischievous spirit from Guyanese and Caribbean folklore, sometimes kept in a bottle and fed milk and bananas to keep it happy.",
    "According to legend, a Baccoo can bring its owner luck and mischief in equal measure — as long as it's kept well fed.",
  ],
  [
    "Kanaima is a spirit of justice from Guyanese Indigenous folklore, said to take the form of a jaguar to deliver retribution.",
    "In Indigenous Guyanese tradition, Kanaima represents balance and justice, punishing wrongdoing by shapeshifting into a jaguar.",
  ],
];
