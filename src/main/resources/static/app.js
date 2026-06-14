const state = {
    songs: [],
    selected: null,
    chords: [],
    editingExisting: false
};

const API_BASE = location.protocol === "file:" ? "http://127.0.0.1:8080" : "";
const TAB_SIZE = 4;

const els = {
    openLibraryButton: document.querySelector("#openLibraryButton"),
    closeLibraryButton: document.querySelector("#closeLibraryButton"),
    libraryPanel: document.querySelector("#libraryPanel"),
    songList: document.querySelector("#songList"),
    searchInput: document.querySelector("#searchInput"),
    newSongButton: document.querySelector("#newSongButton"),
    emptyAddButton: document.querySelector("#emptyAddButton"),
    songTitle: document.querySelector("#songTitle"),
    artistLabel: document.querySelector("#artistLabel"),
    songView: document.querySelector("#songView"),
    emptyState: document.querySelector("#emptyState"),
    editorPanel: document.querySelector("#editorPanel"),
    editorTitle: document.querySelector("#editorTitle"),
    closeEditorButton: document.querySelector("#closeEditorButton"),
    editButton: document.querySelector("#editButton"),
    titleInput: document.querySelector("#titleInput"),
    artistInput: document.querySelector("#artistInput"),
    bodyInput: document.querySelector("#bodyInput"),
    chordInput: document.querySelector("#chordInput"),
    chordList: document.querySelector("#chordList"),
    statusLine: document.querySelector("#statusLine"),
    songForm: document.querySelector("#songForm"),
    addChordButton: document.querySelector("#addChordButton"),
    parseSongButton: document.querySelector("#parseSongButton"),
    deleteButton: document.querySelector("#deleteButton")
};

async function api(path, options = {}) {
    let response;
    try {
        response = await fetch(`${API_BASE}${path}`, {
            headers: {"Content-Type": "application/json"},
            ...options
        });
    } catch (error) {
        throw new Error("Не удалось связаться с сервером. Откройте http://localhost:8080 или запустите Spring Boot.");
    }
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
    closeLibrary();
    renderAll();
}

function fillForm(song) {
    els.titleInput.value = song.title || "";
    els.artistInput.value = song.artist || "";
    els.bodyInput.value = song.body || "";
}

function openLibrary() {
    els.libraryPanel.hidden = false;
    renderSongList();
    els.searchInput.focus();
}

function closeLibrary() {
    els.libraryPanel.hidden = true;
}

function openEditor({isNew}) {
    state.editingExisting = !isNew;
    if (isNew) {
        state.selected = null;
        state.chords = [];
        fillForm({title: "", artist: "", body: ""});
        closeLibrary();
    } else if (state.selected) {
        fillForm(state.selected);
        state.chords = state.selected.chords.map(chord => ({...chord}));
    }
    els.editorTitle.textContent = isNew ? "Новая песня" : "Редактировать";
    els.editorPanel.hidden = false;
    setStatus("");
    renderAll();
    els.titleInput.focus();
}

function closeEditor() {
    els.editorPanel.hidden = true;
    if (state.selected) {
        fillForm(state.selected);
        state.chords = state.selected.chords.map(chord => ({...chord}));
    }
    renderAll();
}

function renderAll() {
    const hasSelection = Boolean(state.selected);
    const title = hasSelection ? state.selected.title : "Chordify";
    els.songTitle.textContent = title;
    els.artistLabel.textContent = hasSelection ? state.selected.artist || "" : "";
    els.emptyState.hidden = hasSelection;
    els.songView.hidden = !hasSelection;
    els.editButton.hidden = !hasSelection;
    els.deleteButton.hidden = !hasSelection;
    renderSongList();
    renderSongView();
    renderChordList();
}

function renderSongView() {
    if (!state.selected) {
        els.songView.replaceChildren();
        return;
    }
    const lines = state.selected.body.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const byLine = groupChordsByLine(state.selected.chords);
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
            renderChordList();
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
    renderChordList();
    els.bodyInput.focus();
}

function handleBodyKeydown(event) {
    if (event.key !== "Tab") {
        return;
    }
    event.preventDefault();
    if (event.shiftKey) {
        outdentSelection(els.bodyInput);
    } else {
        indentSelection(els.bodyInput);
    }
    syncChordsWithBody();
}

function indentSelection(textarea) {
    const {selectionStart, selectionEnd, value} = textarea;
    if (selectionStart === selectionEnd) {
        textarea.setRangeText("\t", selectionStart, selectionEnd, "end");
        return;
    }
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const selected = value.slice(lineStart, selectionEnd);
    const indented = selected.replace(/^/gm, "\t");
    textarea.setRangeText(indented, lineStart, selectionEnd, "select");
    textarea.selectionStart = lineStart;
    textarea.selectionEnd = lineStart + indented.length;
}

function outdentSelection(textarea) {
    const {selectionStart, selectionEnd, value} = textarea;
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const selected = value.slice(lineStart, selectionEnd);
    const outdented = selected.replace(/^(\t| {1,4})/gm, "");
    textarea.setRangeText(outdented, lineStart, selectionEnd, "select");
    textarea.selectionStart = lineStart;
    textarea.selectionEnd = lineStart + outdented.length;
}

function parseSongText() {
    const parsed = parseChordText(els.bodyInput.value);
    els.bodyInput.value = parsed.body;
    state.chords = parsed.chords;
    renderChordList();
    setStatus(parsed.chords.length > 0
        ? `Найдено аккордов: ${parsed.chords.length}`
        : "Аккорды не найдены");
    els.bodyInput.focus();
}

function parseChordText(source) {
    const normalized = source.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalized.split("\n");
    const bodyLines = [];
    const chords = [];
    let pendingChordLine = null;

    lines.forEach(line => {
        const expandedLine = expandTabs(line);
        if (isChordOnlyLine(expandedLine)) {
            pendingChordLine = expandedLine;
            return;
        }

        const inline = parseInlineChordLine(expandedLine);
        const lineIndex = bodyLines.length;
        bodyLines.push(inline.text);
        inline.chords.forEach(chord => {
            chords.push({
                id: null,
                lineIndex,
                charIndex: chord.charIndex,
                symbol: chord.symbol,
                sortOrder: chords.length
            });
        });

        if (pendingChordLine !== null) {
            extractChordLinePositions(pendingChordLine, inline.text).forEach(chord => {
                chords.push({
                    id: null,
                    lineIndex,
                    charIndex: chord.charIndex,
                    symbol: chord.symbol,
                    sortOrder: chords.length
                });
            });
            pendingChordLine = null;
        }
    });

    if (pendingChordLine !== null) {
        bodyLines.push("");
        extractChordLinePositions(pendingChordLine, "").forEach(chord => {
            chords.push({
                id: null,
                lineIndex: bodyLines.length - 1,
                charIndex: chord.charIndex,
                symbol: chord.symbol,
                sortOrder: chords.length
            });
        });
    }

    chords.sort((a, b) => a.lineIndex - b.lineIndex || a.charIndex - b.charIndex || a.sortOrder - b.sortOrder);
    return {
        body: bodyLines.join("\n"),
        chords: chords.map((chord, index) => ({...chord, sortOrder: index}))
    };
}

function parseInlineChordLine(line) {
    const chords = [];
    let text = "";
    let sourceIndex = 0;
    const inlineChord = /\[([A-GH][#b]?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\/[A-GH][#b]?)?)\]/g;
    let match = inlineChord.exec(line);
    while (match !== null) {
        text += line.slice(sourceIndex, match.index);
        chords.push({
            symbol: match[1],
            charIndex: text.length
        });
        sourceIndex = match.index + match[0].length;
        match = inlineChord.exec(line);
    }
    text += line.slice(sourceIndex);
    return {text, chords};
}

function expandTabs(line) {
    let column = 0;
    let expanded = "";
    for (const char of line) {
        if (char === "\t") {
            const spaces = TAB_SIZE - column % TAB_SIZE;
            expanded += " ".repeat(spaces);
            column += spaces;
        } else {
            expanded += char;
            column += 1;
        }
    }
    return expanded;
}

function isChordOnlyLine(line) {
    const trimmed = line.trim();
    if (!trimmed) {
        return false;
    }
    const tokens = trimmed.split(/\s+/);
    return tokens.length > 0 && tokens.every(isChordSymbol);
}

function extractChordLinePositions(chordLine, lyricLine) {
    const result = [];
    const matches = chordLine.matchAll(/\S+/g);
    for (const match of matches) {
        const symbol = match[0];
        if (!isChordSymbol(symbol)) {
            continue;
        }
        result.push({
            symbol,
            charIndex: charIndexForVisualColumn(lyricLine, match.index)
        });
    }
    return result;
}

function charIndexForVisualColumn(line, visualColumn) {
    return Math.min(visualColumn, line.length);
}

function isChordSymbol(value) {
    return /^[A-GH][#b]?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\/[A-GH][#b]?)?$/.test(value);
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
        const saved = state.editingExisting && state.selected
            ? await api(`/api/songs/${state.selected.id}`, {method: "PUT", body: JSON.stringify(payload)})
            : await api("/api/songs", {method: "POST", body: JSON.stringify(payload)});
        state.selected = saved;
        state.chords = saved.chords.map(chord => ({...chord}));
        await loadSongs(false);
        closeEditor();
        renderAll();
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
}

function setStatus(message) {
    els.statusLine.textContent = message;
}

els.openLibraryButton.addEventListener("click", openLibrary);
els.closeLibraryButton.addEventListener("click", closeLibrary);
els.libraryPanel.querySelector("[data-close-library]").addEventListener("click", closeLibrary);
els.newSongButton.addEventListener("click", () => openEditor({isNew: true}));
els.emptyAddButton.addEventListener("click", () => openEditor({isNew: true}));
els.editButton.addEventListener("click", () => openEditor({isNew: false}));
els.closeEditorButton.addEventListener("click", closeEditor);
els.editorPanel.querySelector("[data-close-editor]").addEventListener("click", closeEditor);
els.searchInput.addEventListener("input", renderSongList);
els.addChordButton.addEventListener("click", addChord);
els.parseSongButton.addEventListener("click", parseSongText);
els.songForm.addEventListener("submit", saveSong);
els.deleteButton.addEventListener("click", deleteSong);
els.bodyInput.addEventListener("keydown", handleBodyKeydown);
els.bodyInput.addEventListener("input", syncChordsWithBody);

function syncChordsWithBody() {
    const lines = els.bodyInput.value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    state.chords = state.chords.filter(chord => chord.lineIndex < lines.length && chord.charIndex <= lines[chord.lineIndex].length);
    renderChordList();
}

loadSongs().then(() => {
    renderAll();
}).catch(error => setStatus(error.message));
