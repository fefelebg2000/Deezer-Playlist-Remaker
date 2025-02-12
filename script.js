// Variables globales
let tracks = [];
let decisions = [];  // "keep", "like", "delete" pour chaque morceau
let currentTrackIndex = 0;

// Référence aux éléments DOM
const inputContainer = document.getElementById('playlist-input-container');
const loadButton = document.getElementById('load-playlist');
const playlistInput = document.getElementById('playlist-input');

const reviewSection = document.getElementById('review-section');
const counterEl = document.getElementById('counter');
const trackAlbumCover = document.getElementById('track-album-cover');
const trackTitleEl = document.getElementById('track-title');
const trackPreview = document.getElementById('track-preview');

const keepButton = document.getElementById('keep-track');
const likeButton = document.getElementById('like-track');
const deleteButton = document.getElementById('delete-track');
const backButton = document.getElementById('back-button');

const confirmationSection = document.getElementById('confirmation-section');
const deleteListEl = document.getElementById('delete-list');
const finalizeButton = document.getElementById('finalize');

const headerPlaylistInfo = document.getElementById('playlist-info');
const headerPlaylistCover = document.getElementById('playlist-cover');
const headerPlaylistTitle = document.getElementById('playlist-title');

// --- Fonction de requête JSONP ---
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

// --- Extraction de l'ID de la playlist ---
function extractPlaylistId(input) {
  input = input.trim();
  if (/^\d+$/.test(input)) {
    return input;
  }
  const match = input.match(/playlist\/(\d+)/);
  return match ? match[1] : null;
}

// --- Fonction de mélange (Fisher-Yates) ---
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// --- Chargement de la playlist ---
function loadPlaylist(playlistId) {
  const url = `https://api.deezer.com/playlist/${playlistId}?output=jsonp`;
  fetchJSONP(url)
    .then(data => {
      if (data.error) {
        alert('Erreur lors du chargement de la playlist.');
        return;
      }
      // Afficher les infos de la playlist dans le header
      headerPlaylistTitle.textContent = data.title;
      headerPlaylistCover.src = data.picture_medium || data.picture || '';
      headerPlaylistInfo.style.display = 'flex';
      
      // Récupérer et mélanger les morceaux
      tracks = shuffle(data.tracks.data);
      decisions = new Array(tracks.length).fill(null);
      if (tracks.length === 0) {
        alert("Cette playlist ne contient aucun morceau.");
        return;
      }
      currentTrackIndex = 0;
      inputContainer.style.display = 'none';
      reviewSection.style.display = 'block';
      showCurrentTrack();
    })
    .catch(err => {
      console.error(err);
      alert("Erreur lors de la récupération de la playlist.");
    });
}

// --- Affichage du morceau courant ---
function showCurrentTrack() {
  // Mise à jour du compteur
  counterEl.textContent = `Titre ${currentTrackIndex + 1} / ${tracks.length}`;
  
  if (currentTrackIndex < tracks.length) {
    const track = tracks[currentTrackIndex];
    trackTitleEl.textContent = `${track.title} - ${track.artist.name}`;
    trackAlbumCover.src = (track.album && track.album.cover_medium) || '';
    trackPreview.src = track.preview;
    // Tente de lancer l'auto-play (peut être bloqué par le navigateur)
    trackPreview.play().catch(() => {});
    
    // Réinitialiser l'état des boutons (suppression de la classe "selected")
    [keepButton, likeButton, deleteButton].forEach(btn => btn.classList.remove('selected'));
    // Si un choix a déjà été fait sur ce morceau, le réafficher
    const prevDecision = decisions[currentTrackIndex];
    if (prevDecision) {
      if (prevDecision === 'keep') keepButton.classList.add('selected');
      else if (prevDecision === 'like') likeButton.classList.add('selected');
      else if (prevDecision === 'delete') deleteButton.classList.add('selected');
    }
  } else {
    // Fin de la revue : affichage de la confirmation des suppressions
    reviewSection.style.display = 'none';
    showConfirmation();
  }
}

// --- Gestion de l'animation sur clic ---
function animateClick(element, callback) {
  element.classList.add('animate');
  setTimeout(() => {
    element.classList.remove('animate');
    if (callback) callback();
  }, 200);
}

// --- Gestion des décisions ---
function makeDecision(decision) {
  // Enregistrer le choix pour le morceau courant
  decisions[currentTrackIndex] = decision;
  
  // Mettre en évidence le bouton sélectionné
  [keepButton, likeButton, deleteButton].forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.decision === decision);
  });
  
  // Animation sur le conteneur
  animateClick(document.getElementById('track-container'), () => {
    currentTrackIndex++;
    showCurrentTrack();
  });
}

// --- Bouton Retour ---
backButton.addEventListener('click', () => {
  if (currentTrackIndex > 0) {
    // Revenir sur le morceau précédent
    currentTrackIndex--;
    showCurrentTrack();
  }
});

// --- Événements sur les boutons de décision ---
keepButton.addEventListener('click', () => {
  animateClick(keepButton, () => makeDecision('keep'));
});
likeButton.addEventListener('click', () => {
  animateClick(likeButton, () => makeDecision('like'));
});
deleteButton.addEventListener('click', () => {
  animateClick(deleteButton, () => makeDecision('delete'));
});

// --- Chargement de la playlist lors du clic ---
loadButton.addEventListener('click', () => {
  const input = playlistInput.value;
  const id = extractPlaylistId(input);
  if (!id) {
    alert("Veuillez entrer un ID ou un lien valide de playlist.");
    return;
  }
  loadPlaylist(id);
});

// --- Affichage de la confirmation ---
function showConfirmation() {
  // Générer la liste des morceaux marqués pour suppression
  deleteListEl.innerHTML = ''; // Réinitialiser la liste
  tracks.forEach((track, index) => {
    if (decisions[index] === 'delete') {
      const li = document.createElement('li');
      li.textContent = `${track.title} - ${track.artist.name}`;
      // Bouton pour annuler la suppression
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = "Annuler";
      cancelBtn.addEventListener('click', () => {
        // Modifier le choix en "keep"
        decisions[index] = 'keep';
        // Supprimer cet élément de la liste
        li.remove();
      });
      li.appendChild(cancelBtn);
      deleteListEl.appendChild(li);
    }
  });
  confirmationSection.style.display = 'block';
}

// --- Finalisation et téléchargement JSON ---
finalizeButton.addEventListener('click', () => {
  // Construire la liste finale des morceaux à conserver (ceux non supprimés)
  const finalTracks = [];
  tracks.forEach((track, index) => {
    if (decisions[index] !== 'delete') {
      finalTracks.push({
        id: track.id,
        title: track.title,
        artist: track.artist.name,
        album: track.album.title,
        preview: track.preview,
        cover: (track.album && track.album.cover_medium) || '',
        decision: decisions[index]
      });
    }
  });
  const dataStr = JSON.stringify(finalTracks, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'final_tracks.json';
  a.click();
  URL.revokeObjectURL(url);
});