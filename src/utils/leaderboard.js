const API_URL = 'http://localhost:3001/api/scores';

export async function getTopScores() {
  try {
    const res = await fetch(API_URL);
    const json = await res.json();
    return json.data || [];
  } catch (e) {
    console.error("Failed to fetch leaderboard", e);
    return [];
  }
}

export async function saveScore(name, score) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: name.toUpperCase().substring(0, 3), score })
    });
    const json = await res.json();
    return json.data || [];
  } catch (e) {
    console.error("Failed to save score", e);
    return [];
  }
}
