
// Step 1: Drop existing tracks collection if it exists
if (db.getCollectionNames().includes("tracks")) {
  db.tracks.drop();
  print("Dropped existing 'tracks' collection.");
}

// Step 2-7: Transform tracks_raw into tracks
db.tracks_raw.aggregate([
  // Step 2: Project only needed fields
  {
    $project: {
      _id: 0,
      track_id: 1,
      track_name: 1,
      album_name: 1,
      explicit: 1,
      popularity: 1,
      duration_ms: 1,
      track_genre: 1,
      artists_raw: "$artists",
      // Step 4: Build audio_features nested object
      audio_features: {
        danceability: "$danceability",
        energy: "$energy",
        loudness: "$loudness",
        speechiness: "$speechiness",
        acousticness: "$acousticness",
        instrumentalness: "$instrumentalness",
        liveness: "$liveness",
        valence: "$valence",
        tempo: "$tempo",
        key: "$key",
        mode: "$mode",
        time_signature: "$time_signature",
      },
      // Step 5: duration in seconds, rounded to 1 decimal
      duration_sec: {
        $round: [{ $divide: ["$duration_ms", 1000] }, 1],
      },
      // Step 6: popularity_tier
      popularity_tier: {
        $switch: {
          branches: [
            { case: { $gte: ["$popularity", 70] }, then: "high" },
            { case: { $gte: ["$popularity", 40] }, then: "medium" },
          ],
          default: "low",
        },
      },
    },
  },
  // Step 3: Split artists_raw string into array
  {
    $addFields: {
      artists: {
        $map: {
          input: { $split: ["$artists_raw", ";"] },
          as: "name",
          in: { $trim: { input: "$$name" } },
        },
      },
    },
  },
  // Step 7: Remove artists_raw field
  {
    $unset: "artists_raw",
  },
  // Write to the tracks collection
  {
    $out: "tracks",
  },
]);

// Step 8: Print document count
const count = db.tracks.countDocuments();
print(`\nTotal documents in 'tracks': ${count}`);

// Step 9: Print one example document
print("\nExample document:");
printjson(db.tracks.findOne());
