let tracks = [];
let currentTrackIndex = 0;
let keptTracks = [];

function fetchJSONP(url) {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
    const jsonpUrl = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
    const script = document.createElement('script');
    script.src = jsonpUrl;

    window[callbackName] = function(data) {
      delete window[callbackName];
      document.body.removeChild(script);
      resolve(data);
    };

    script.onerror = function() {
      delete window[callbackName];
      document.body.removeChild(script);
      reject(new Error('Erreur JSONP'));
    };

    document.body.appendChild(script);
  });
}

function extractPlaylistId(input) {
  if (/^\d+$/.test(input.trim())) {
    return input.trim();
  }
  const match = input.match(/playlist\/(\d+)/);
  return match ? match[1] : null;
}

function loadPlaylist(playlistId) {
  fetchJSONP(`https://api.deezer.com/playlist/${playlistId}?output=jsonp`)
    .then(data => {
      if (data.error) {
        alert('Erreur de chargement');
        return;
      }
      displayPlaylistInfo(data);
      tracks = data.tracks.data;
      if (!tracks.length) {
        alert("Playlist vide.");
        return;
      }
      currentTrackIndex = 0;
      keptTracks = [];
      document.getElementById('playlist-input-container').style.display = 'none';
      document.getElementById('track-section').style.display = 'flex';
      showCurrentTrack();
    })
    .catch(() => alert("Erreur de récupération."));
}

function displayPlaylistInfo(playlist) {
  document.getElementById('playlist-title').textContent = playlist.title;
  document.getElementById('playlist-cover').src = playlist.picture_medium || playlist.picture;
  document.getElementById('playlist-info').style.display = 'flex';
}

function showCurrentTrack() {
  if (currentTrackIndex < tracks.length) {
    const track = tracks[currentTrackIndex];
    document.getElementById('track-title').textContent = `${track.title} - ${track.artist.name}`;
    document.getElementById('track-album-cover').src = track.album.cover_medium || '';
    const audio = document.getElementById('track-preview');
    audio.src = track.preview;
    audio.play().catch(() => console.log("Lecture auto bloquée."));
  } else {
    document.getElementById('track-section').style.display = 'none';
    document.getElementById('end-section').style.display = 'block';
  }
}

document.getElementById('load-playlist').addEventListener('click', () => {
  const input = document.getElementById('playlist-input').value;
  const id = extractPlaylistId(input);
  if (!id) {
    alert("ID/Lien invalide.");
    return;
  }
  loadPlaylist(id);
});

document.getElementById('keep-track').addEventListener('click', () => {
  keptTracks.push(tracks[currentTrackIndex]);
  currentTrackIndex++;
  showCurrentTrack();
});

document.getElementById('delete-track').addEventListener('click', () => {
  currentTrackIndex++;
  showCurrentTrack();
});

document.getElementById('download-json').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(keptTracks, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'kept_tracks.json';
  a.click();
});
