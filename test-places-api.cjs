const fs = require('fs');
const content = fs.readFileSync('src/services/googlePlaces.ts', 'utf8');
const keyMatch = content.match(/AIza[a-zA-Z0-9\-_]+/);
if (!keyMatch) {
  console.log("No API key found in source.");
  process.exit(1);
}
const apiKey = keyMatch[0];

fetch('https://places.googleapis.com/v1/places:searchNearby', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': 'places.id,places.displayName',
    'Referer': 'http://localhost:5173/'
  },
  body: JSON.stringify({
    includedTypes: ["hospital"],
    maxResultCount: 1,
    locationRestriction: {
      circle: {
        center: { latitude: 13.0827, longitude: 80.2707 },
        radius: 5000
      }
    }
  })
})
.then(res => res.json())
.then(data => {
  if (data.error) {
    console.error("API ERROR:", JSON.stringify(data.error));
  } else {
    console.log("SUCCESS:", JSON.stringify(data));
  }
})
.catch(err => console.error("FETCH ERROR:", err));
