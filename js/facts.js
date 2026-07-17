/*
  facts.js
  Real, kid-appropriate Guyana trivia. `facts[i]` corresponds to level index i (0-9).
  Each entry has a short `intro` fact (shown automatically at level start) and a
  handful of `bonus` facts (unlocked one at a time as the player collects the
  3 hidden culture gems in that level).
*/

const FACTS = [
  { // Level 1 - Stabroek Market & Sea Wall
    intro: "Georgetown, Guyana's capital, sits below sea level and is protected by a Sea Wall built by the Dutch centuries ago!",
    bonus: [
      "Stabroek Market's iconic clock tower has been a Georgetown landmark since 1881.",
      "Guyana's flag is nicknamed 'The Golden Arrowhead' for its bold gold triangle.",
      "Georgetown was once laid out with canals, earning it the nickname 'Garden City of the Caribbean'."
    ]
  },
  { // Level 2 - Demerara Riverside
    intro: "The Demerara River stretches for about 346 km (215 miles) and gave its name to Demerara sugar!",
    bonus: [
      "Sugar cane has been grown along the Demerara River since the 1700s.",
      "The Demerara Harbour Bridge was once one of the longest floating bridges in the world.",
      "Guyana's rivers were the main highways before roads connected the interior."
    ]
  },
  { // Level 3 - Essequibo Mangroves
    intro: "The mighty Essequibo River drains nearly 70% of Guyana and is the largest river in the country!",
    bonus: [
      "Mangrove roots along the Essequibo protect the coastline from erosion.",
      "The Essequibo is dotted with hundreds of small islands, some larger than entire nations!",
      "Guyana's mangroves are home to crabs, fish, and nesting birds found nowhere else nearby."
    ]
  },
  { // Level 4 - Iwokrama Rainforest Canopy
    intro: "The Iwokrama Forest protects nearly 4,000 sq km of pristine rainforest for conservation and research.",
    bonus: [
      "Iwokrama's canopy walkway lets visitors walk high above the forest floor among the treetops.",
      "Guyana is one of the most forested countries on Earth — over 80% is covered in rainforest.",
      "The forest is home to jaguars, giant otters, and the world's largest eagle, the harpy eagle."
    ]
  },
  { // Level 5 - Kaieteur Falls
    intro: "Kaieteur Falls plunges about 226 meters (741 feet) in a single drop — nearly five times taller than Niagara Falls!",
    bonus: [
      "Kaieteur is one of the world's most powerful single-drop waterfalls by volume of water.",
      "The falls are named after a legendary Patamona chief named Kaie.",
      "Golden frogs live in the giant tank bromeliads that grow near Kaieteur's mist."
    ]
  },
  { // Level 6 - Rupununi Savannah
    intro: "The Rupununi Savannah covers about 15,000 square kilometers of open grassland in southern Guyana.",
    bonus: [
      "Giant anteaters and giant river otters both roam the Rupununi wetlands.",
      "Jaguars, the largest cats in the Americas, still prowl Guyana's forests and savannahs.",
      "Fireflies light up Rupununi nights like tiny floating lanterns."
    ]
  },
  { // Level 7 - Pork-Knocker Trail
    intro: "'Pork-knockers' are Guyana's traditional small-scale gold and diamond miners who work the interior trails.",
    bonus: [
      "The name 'pork-knocker' comes from miners once trading salted pork along the trails.",
      "Guyana has been a source of gold and diamonds since the 1800s.",
      "Many pork-knocker trails follow old rivers and creeks deep into the interior."
    ]
  },
  { // Level 8 - Bush Camp Clearing
    intro: "Interior travelers set up 'bush camps' with hammocks strung between trees for the night.",
    bonus: [
      "Hammocks, first used by Indigenous peoples, are still the go-to bed in Guyana's interior.",
      "Guyana is home to nine Indigenous peoples, each with their own language and traditions.",
      "Cassava bread, made from the cassava root, is a staple food cooked at many bush camps."
    ]
  },
  { // Level 9 - Shell Beach
    intro: "Shell Beach is a vital nesting site where four species of sea turtles lay their eggs, including giant leatherbacks.",
    bonus: [
      "Leatherback turtles can grow larger than a bathtub and swim thousands of miles across the ocean.",
      "Conservationists and local communities patrol Shell Beach together to protect turtle nests.",
      "Baby turtles, called hatchlings, use the moonlight over the ocean to find their way to the water."
    ]
  },
  { // Level 10 - Kanuku Mountains Trail
    intro: "The Kanuku Mountains are considered one of the most biodiverse protected areas on the planet.",
    bonus: [
      "Kanuku is a Wapishana word, and the mountains are sacred to local Indigenous communities.",
      "Scientists have recorded over 400 bird species in the Kanuku Mountains.",
      "The Kanukus form a rugged, forested wall rising straight out of the Rupununi Savannah."
    ]
  }
];

const BOSS_FACTS = [
  "Ole Higue is a shape-shifting figure from Guyanese folklore said to shed her skin at night — leave salt or rice by the door and she'll have to stop and count every grain!",
  "Massacooraman is a legendary river giant said to guard Guyana's waterways and stir up the water when boats get too bold.",
  "Moongazers are tall misty figures from folklore said to stand silently at crossroads, staring up at the moon.",
  "Baccoo is a small, mischievous spirit from Guyanese and Caribbean folklore, sometimes kept in a bottle and fed milk and bananas to keep it happy.",
  "Kanaima is a spirit of justice from Guyanese Indigenous folklore, said to take the form of a jaguar to deliver retribution."
];
