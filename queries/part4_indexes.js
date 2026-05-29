//Завдання 1. Аналіз запиту та індексація

db.tracks.find({
    track_genre: "pop",
    "audio_features.danceability": { $gte: 0.7 }
}).sort({ popularity: -1 })
    .toArray();

//create index on track_genre and audio_features.danceability
db.tracks.createIndex({
    track_genre: 1,
    "audio_features.danceability": 1
});

// Завдання 2. Індекс для інших полів
// Припустимо, що ви часто шукаєте музику для роботи, 
// використовуючи поля 
//  audio_features.instrumentalness, 
//  audio_features.speechiness 
//  та explicit. 
// Щоб такі запити виконувалися ефективно, 
// створіть складений індекс за цими полями та за допомогою explain() покажіть, 
// що він використовується при виконанні пошуку.

db.tracks.createIndex({
    "audio_features.instrumentalness": 1,
    "audio_features.speechiness": 1,
    explicit: 1,
});

db.tracks.find({
    "audio_features.instrumentalness": { $gt: 0.5 },
    "audio_features.speechiness": { $lt: 0.1 },
    explicit: false,
});

//Завдання 3
//враховуючи індекси з завдання 1 та 2, поясніть чи є запит нижче покриваючим (covered query) чи ні, та чому. Якщо ні, то які поля потрібно додати до індексу, щоб зробити його покриваючим?)

db.tracks.find({
  track_genre: "pop",
  popularity: { $gte: 70 }
});

//ВІДПОВІДЬ: Цей запит не є покриваючим, 
// оскільки він використовує поле popularity, 
// яке не входить до індексу, створеного в завданні 1. 
// Щоб зробити цей запит покриваючим, потрібно додати поле popularity до індексу, створеного в завданні 1. 
// Індекс повинен виглядати так:
// db.tracks.createIndex({
//     track_genre: 1,
//     "audio_features.danceability": 1,
//     popularity: 1
// });

