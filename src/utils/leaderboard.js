const API_URL = import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL}/api/scores` : 'https://dani-backend.ngrok-free.dev/api/scores';

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
      body: JSON.stringify({ name: name.toUpperCase().substring(0, 10), score })
    });
    const json = await res.json();
    return json.data || [];
  } catch (e) {
    console.error("Failed to save score", e);
    return [];
  }
}

export async function saveBothScores(p1Name, p1Score, p2Name, p2Score) {
  try {
    const res = await fetch(`${API_URL}/multiplayer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p1Name: p1Name.toUpperCase().substring(0, 10), p1Score, p2Name: p2Name.toUpperCase().substring(0, 10), p2Score })
    });
    const json = await res.json();
    return json.data || [];
  } catch (e) {
    console.error("Failed to save both scores", e);
    return [];
  }
}
