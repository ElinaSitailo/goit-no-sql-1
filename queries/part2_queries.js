// Завдання 1. Треки для вечірки
// Знайдіть треки, що підходять для вечірки. 
// Такі треки повинні мати високий danceability (вище 0.7) 
// та високу енергію (також вище 0.7), 
// а тривалість — від 3 до 5 хвилин (180000–300000 мс).

db.tracks.find({
    "audio_features.danceability": { $gt: 0.7 }, // Високий danceability
    "audio_features.energy": { $gt: 0.7 }, // Висока енергія
    duration_ms: { $gte: 180000, $lte: 300000 }, // Тривалість від 3 до 5 хвилин
}).limit(1);

/*
{
    _id: ObjectId('6a199c33f137ba9423d629de'),
    track_id: '4LbWtBkN82ZRhz9jqzgrb3',
    album_name: 'Hold On (Remix)',
    track_name: 'Hold On - Remix',
    popularity: 56,
    duration_ms: 188133,
    explicit: false,
    track_genre: 'acoustic',
    audio_features: {
      danceability: 0.755,
      energy: 0.78,
      loudness: -6.084,
      speechiness: 0.0327,
      acousticness: 0.124,
      instrumentalness: 0.0000283,
      liveness: 0.121,
      valence: 0.387,
      tempo: 120.004,
      key: 2,
      mode: 1,
      time_signature: 4
    },
    duration_sec: 188.1,
    popularity_tier: 'medium',
    artists: [ 'Chord Overstreet', 'Deepend' ]
  },
*/

//кількість треків, що підходять для вечірки
db.tracks.countDocuments({
    "audio_features.danceability": { $gt: 0.7 },
    "audio_features.energy": { $gt: 0.7 },
    duration_ms: { $gte: 180000, $lte: 300000 },
}); // --> 7311


//------------------------------------------------------------------------------------------------------
//Завдання 2. Виконавці, у яких усі треки популярні
//Вважатимемо артиста популярним, якщо у нього 
// є мінімум 3 треки 
// і при цьому мінімальна популярність цих треків становить 60% або вище.
// Знайдіть топ-20 таких артистів і виведіть для кожного 
// ім’я артиста кількість треків, 
// мінімальну та середню популярність з точністю до одного знака після коми.

db.tracks.aggregate([
    { $unwind: "$artists" }, // Розгортаємо масив артистів
    {
        $group: {
            _id: "$artists", // Групуємо за ім'ям артиста
            trackCount: { $sum: 1 }, // Рахуємо кількість треків
            minPopularity: { $min: "$popularity" }, // Мінімальна популярність
            avgPopularity: { $avg: "$popularity" } // Середня популярність
        }
    },
    {
        $match: {
            trackCount: { $gte: 3 }, // Мінімум 3 треки
            minPopularity: { $gte: 60 } // Мінімальна популярність 60% або вище
        }
    },
    {
        $project: {
            _id: 0, // Не виводимо _id
            artists: "$_id", // Виводимо ім'я артиста
            trackCount: 1, // Кількість треків
            minPopularity: 1, // Мінімальна популярність
            avgPopularity: { $round: ["$avgPopularity", 1] } // Середня популярність з точністю до одного знака після коми
        }
    },
    { $sort: { avgPopularity: -1 } }, // Сортуємо за середньою популярністю у спадному порядку
    { $limit: 20 } // Виводимо топ-20 артистів
]);

/*
[
  {
    trackCount: 3,
    minPopularity: 89,
    artist: 'Harry Styles',
    avgPopularity: 92
  },
  {
    trackCount: 4,
    minPopularity: 90,
    artist: 'Luar La L',
    avgPopularity: 90.5
  },
  {
    trackCount: 5,
    minPopularity: 86,
    artist: 'Olivia Rodrigo',
    avgPopularity: 87.4
  },
  { trackCount: 4, minPopularity: 87, artist: 'BYOR', avgPopularity: 87 },
  { trackCount: 3, minPopularity: 79, artist: 'IVE', avgPopularity: 84 },
  {
    trackCount: 12,
    minPopularity: 76,
    artist: 'Måneskin',
    avgPopularity: 83.7
  },
  */

//------------------------------------------------------------------------------------------------------
//Завдання 3. Нетипові треки
//Визначте треки з незвично високим темпом для їхнього жанру за наступним алгоритмом: 
// спочатку розрахуйте середнє значення tempo за допомогою функції $avg 
// та стандартне відхилення за допомогою $stdDevPop по кожному жанру, 
// потім виберіть треки, 
//  у яких tempo перевищує середнє плюс два стандартні відхилення (tempo треку > mean жанру + 2 * stdDev жанру).
// У результаті для кожного жанру додайте поля: 
//      "avg_tempo" — середній темп, 
//      "genre" — назва жанру, 
//      "outlier_threshold" — значення порогу для нетипових треків, 
//      і "outlier_tracks" — масив об’єктів з інформацією про треки

db.tracks.aggregate([
    {
        $group: {
            _id: "$track_genre", // Групуємо за жанром
            avg_tempo: { $avg: "$audio_features.tempo" }, // Середній темп
            stdDev_tempo: { $stdDevPop: "$audio_features.tempo" } // Стандартне відхилення темпу
        }
    },
    {
        $addFields: {
            outlier_threshold: { $add: ["$avg_tempo", { $multiply: [2, "$stdDev_tempo"] }] } // Поріг для нетипових треків
        }
    },
    {
        $lookup: {
            from: "tracks", // Колекція треків
            let: { genre: "$_id", threshold: "$outlier_threshold" }, // Локальні змінні для жанру та порогу
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                { $eq: ["$track_genre", "$$genre"] }, // Відбираємо треки того ж жанру
                                { $gt: ["$audio_features.tempo", "$$threshold"] } // Відбираємо треки з темпом вище порогу
                            ]
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        track_name: 1,
                        artists: 1,
                        audio_features: 1
                    }
                }
            ],
            as: "outlier_tracks"
        }
    },
    {
        $project: {
            _id: 0,
            genre: "$_id",
            avg_tempo: 1,
            stdDev_tempo: 1,
            outlier_threshold: 1,
            outlier_tracks: 1
        }
    },
    { $out: "genre_outliers" } // Зберігаємо результат в нову колекцію genre_outliers
]);

//Завдання 4: Треки для фонової роботи
// Знайдіть треки, які підходять для фонового прослуховування під час роботи: 
// тихі (loudness < -10), 
// з низькою мовленнєвою складовою (speechiness < 0,1), 
// переважно інструментальні (instrumentalness > 0,5) 
// і не містять explicit-контенту.
// Відсортуйте рузультати від гучніших до тихіших і виведіть перші 10 треків.
db.tracks.find({
    "audio_features.loudness": { $lt: -10 }, // Тихі треки
    "audio_features.speechiness": { $lt: 0.1 }, // Низька мовленнєва складова
    "audio_features.instrumentalness": { $gt: 0.5 }, // Переважно інструментальні
    explicit: false // Не містять explicit-контенту
})
.sort({ "audio_features.loudness": -1 })
.limit(10); // Сортуємо від гучніших до тихіших і виводимо перші 10 треків