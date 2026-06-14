const state = {
    songs: [],
    selected: null,
    chords: []
};

const els = {
    songList: document.querySelector("#songList"),
    searchInput: document.querySelector("#searchInput"),
    songTitle: document.querySelector("#songTitle"),
    artistLabel: document.querySelector("#artistLabel"),
    songView: document.querySelector("#songView"),
    titleInput: document.querySelector("#titleInput"),
    artistInput: document.querySelector("#artistInput"),
    bodyInput: document.querySelector("#bodyInput"),
    chordInput: document.querySelector("#chordInput"),
    chordList: document.querySelector("#chordList"),
    statusLine: document.querySelector("#statusLine"),
    songForm: document.querySelector("#songForm"),
    newSongButton: document.querySelector("#newSongButton"),
    addChordButton: document.querySelector("#addChordButton"),
    deleteButton: document.querySelector("#deleteButton")
};

async function api(path, options = {}) {
    const response = await fetch(path, {
        headers: {"Content-Type": "application/json"},
        ...options
    });
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Ошибка запроса");
    }
    if (response.status === 204) {
        return null;
    }
    return response.json();
}

async function loadSongs(selectFirst = true) {
    state.songs = await api("/api/songs");
    renderSongList();
    if (selectFirst && !state.selected && state.songs.length > 0) {
        await selectSong(state.songs[0].id);
    }
}

function renderSongList() {
    const query = els.searchInput.value.trim().toLowerCase();
    const songs = state.songs.filter(song => {
        const haystack = `${song.title} ${song.artist || ""}`.toLowerCase();
        return haystack.includes(query);
    });
    els.songList.replaceChildren(...songs.map(song => {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = state.selected?.id === song.id ? "active" : "";
        button.addEventListener("click", () => selectSong(song.id));
        const title = document.createElement("span");
        title.textContent = song.title;
        const meta = document.createElement("small");
        meta.textContent = [song.artist, `${song.chordCount} акк.`].filter(Boolean).join(" · ");
        button.append(title, meta);
        item.append(button);
        return item;
    }));
}

async function selectSong(id) {
    state.selected = await api(`/api/songs/${id}`);
    state.chords = state.selected.chords.map(chord => ({...chord}));
    fillForm(state.selected);
    renderAll();
}

function fillForm(song) {
    els.titleInput.value = song.title || "";
    els.artistInput.value = song.artist || "";
    els.bodyInput.value = song.body || "";
}

function newSong() {
    state.selected = null;
    state.chords = [];
    fillForm({title: "", artist: "", body: ""});
    renderAll();
    els.titleInput.focus();
}

function renderAll() {
    const title = els.titleInput.value.trim() || "Новая песня";
    els.songTitle.textContent = title;
    els.artistLabel.textContent = els.artistInput.value.trim();
    renderSongList();
    renderSongView();
    renderChordList();
    els.deleteButton.hidden = !state.selected;
}

function renderSongView() {
    const lines = els.bodyInput.value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const byLine = groupChordsByLine(state.chords);
    const fragments = lines.map((line, lineIndex) => renderLine(line, byLine.get(lineIndex) || []));
    els.songView.replaceChildren(...fragments);
}

function groupChordsByLine(chords) {
    const byLine = new Map();
    chords.forEach(chord => {
        if (!byLine.has(chord.lineIndex)) {
            byLine.set(chord.lineIndex, []);
        }
        byLine.get(chord.lineIndex).push(chord);
    });
    return byLine;
}

function renderLine(line, chords) {
    const wrapper = document.createElement("div");
    wrapper.className = "song-line";
    const grid = document.createElement("div");
    grid.className = "line-grid";
    const chars = line.length > 0 ? [...line] : [" "];
    chars.forEach(char => {
        const span = document.createElement("span");
        span.className = "lyric-char";
        span.textContent = char === " " ? "\u00a0" : char;
        grid.append(span);
    });
    chords.forEach(chord => {
        const span = document.createElement("span");
        span.className = "chord-token";
        span.textContent = chord.symbol;
        span.style.gridColumn = `${chord.charIndex + 1}`;
        grid.append(span);
    });
    wrapper.append(grid);
    return wrapper;
}

function renderChordList() {
    const lines = els.bodyInput.value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const items = state.chords.map((chord, index) => {
        const item = document.createElement("li");
        const label = document.createElement("span");
        const line = lines[chord.lineIndex] || "";
        const snippet = line.slice(Math.max(0, chord.charIndex - 8), chord.charIndex + 12).trim();
        label.textContent = `${chord.symbol}: строка ${chord.lineIndex + 1}, символ ${chord.charIndex + 1}${snippet ? `, "${snippet}"` : ""}`;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "×";
        remove.title = "Убрать аккорд";
        remove.addEventListener("click", () => {
            state.chords.splice(index, 1);
            renderAll();
        });
        item.append(label, remove);
        return item;
    });
    els.chordList.replaceChildren(...items);
}

function cursorPositionToLineChar(textarea) {
    const text = textarea.value.slice(0, textarea.selectionStart).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = text.split("\n");
    return {
        lineIndex: lines.length - 1,
        charIndex: lines[lines.length - 1].length
    };
}

function addChord() {
    const symbol = els.chordInput.value.trim();
    if (!symbol) {
        setStatus("Введите аккорд");
        els.chordInput.focus();
        return;
    }
    const position = cursorPositionToLineChar(els.bodyInput);
    state.chords.push({
        id: null,
        ...position,
        symbol,
        sortOrder: state.chords.length
    });
    state.chords.sort((a, b) => a.lineIndex - b.lineIndex || a.charIndex - b.charIndex || a.sortOrder - b.sortOrder);
    els.chordInput.value = "";
    renderAll();
    els.bodyInput.focus();
}

async function saveSong(event) {
    event.preventDefault();
    const payload = {
        title: els.titleInput.value,
        artist: els.artistInput.value,
        body: els.bodyInput.value,
        chords: state.chords.map((chord, index) => ({...chord, sortOrder: index}))
    };
    try {
        const saved = state.selected
            ? await api(`/api/songs/${state.selected.id}`, {method: "PUT", body: JSON.stringify(payload)})
            : await api("/api/songs", {method: "POST", body: JSON.stringify(payload)});
        state.selected = saved;
        state.chords = saved.chords.map(chord => ({...chord}));
        await loadSongs(false);
        renderAll();
        setStatus("Сохранено");
    } catch (error) {
        setStatus(error.message);
    }
}

async function deleteSong() {
    if (!state.selected) {
        return;
    }
    await api(`/api/songs/${state.selected.id}`, {method: "DELETE"});
    state.selected = null;
    state.chords = [];
    fillForm({title: "", artist: "", body: ""});
    await loadSongs(true);
    renderAll();
    setStatus("Удалено");
}

function setStatus(message) {
    els.statusLine.textContent = message;
}

els.newSongButton.addEventListener("click", newSong);
els.searchInput.addEventListener("input", renderSongList);
els.addChordButton.addEventListener("click", addChord);
els.songForm.addEventListener("submit", saveSong);
els.deleteButton.addEventListener("click", deleteSong);
els.titleInput.addEventListener("input", renderAll);
els.artistInput.addEventListener("input", renderAll);
els.bodyInput.addEventListener("input", () => {
    state.chords = state.chords.filter(chord => {
        const lines = els.bodyInput.value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
        return chord.lineIndex < lines.length && chord.charIndex <= lines[chord.lineIndex].length;
    });
    renderAll();
});

loadSongs().then(() => {
    if (!state.selected) {
        newSong();
    }
}).catch(error => setStatus(error.message));
