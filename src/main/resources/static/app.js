const state = {
    songs: [],
    selected: null,
    chords: [],
    editingExisting: false
};

const API_BASE = location.protocol === "file:" ? "http://127.0.0.1:8080" : "";
const TAB_SIZE = 4;
const CHORD_DIAGRAMS = {
    A: {frets: ["x", 0, 2, 2, 2, 0], fingers: ["", "", "1", "2", "3", ""]},
    Am: {frets: ["x", 0, 2, 2, 1, 0], fingers: ["", "", "2", "3", "1", ""]},
    A7: {frets: ["x", 0, 2, 0, 2, 0], fingers: ["", "", "2", "", "3", ""]},
    B: {base: 2, frets: ["x", 1, 3, 3, 3, 1], fingers: ["", "1", "3", "3", "3", "1"], barre: {fret: 1, from: 1, to: 5}},
    Bm: {base: 2, frets: ["x", 1, 3, 3, 2, 1], fingers: ["", "1", "3", "4", "2", "1"], barre: {fret: 1, from: 1, to: 5}},
    B7: {frets: ["x", 2, 1, 2, 0, 2], fingers: ["", "2", "1", "3", "", "4"]},
    C: {frets: ["x", 3, 2, 0, 1, 0], fingers: ["", "3", "2", "", "1", ""]},
    C7: {frets: ["x", 3, 2, 3, 1, 0], fingers: ["", "3", "2", "4", "1", ""]},
    D: {frets: ["x", "x", 0, 2, 3, 2], fingers: ["", "", "", "1", "3", "2"]},
    Dm: {frets: ["x", "x", 0, 2, 3, 1], fingers: ["", "", "", "2", "3", "1"]},
    D7: {frets: ["x", "x", 0, 2, 1, 2], fingers: ["", "", "", "2", "1", "3"]},
    E: {frets: [0, 2, 2, 1, 0, 0], fingers: ["", "2", "3", "1", "", ""]},
    Em: {frets: [0, 2, 2, 0, 0, 0], fingers: ["", "2", "3", "", "", ""]},
    E7: {frets: [0, 2, 0, 1, 0, 0], fingers: ["", "2", "", "1", "", ""]},
    F: {frets: [1, 3, 3, 2, 1, 1], fingers: ["1", "3", "4", "2", "1", "1"], barre: {fret: 1, from: 0, to: 5}},
    Fm: {frets: [1, 3, 3, 1, 1, 1], fingers: ["1", "3", "4", "1", "1", "1"], barre: {fret: 1, from: 0, to: 5}},
    F7: {frets: [1, 3, 1, 2, 1, 1], fingers: ["1", "3", "1", "2", "1", "1"], barre: {fret: 1, from: 0, to: 5}},
    G: {frets: [3, 2, 0, 0, 0, 3], fingers: ["3", "2", "", "", "", "4"]},
    G7: {frets: [3, 2, 0, 0, 0, 1], fingers: ["3", "2", "", "", "", "1"]},
    H: {base: 2, frets: ["x", 1, 3, 3, 3, 1], fingers: ["", "1", "3", "3", "3", "1"], barre: {fret: 1, from: 1, to: 5}},
    Hm: {base: 2, frets: ["x", 1, 3, 3, 2, 1], fingers: ["", "1", "3", "4", "2", "1"], barre: {fret: 1, from: 1, to: 5}},
    H7: {frets: ["x", 2, 1, 2, 0, 2], fingers: ["", "2", "1", "3", "", "4"]}
};

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
    songWorkspace: document.querySelector("#songWorkspace"),
    chordPanel: document.querySelector("#chordPanel"),
    emptyState: document.querySelector("#emptyState"),
    editorPanel: document.querySelector("#editorPanel"),
    editorTitle: document.querySelector("#editorTitle"),
    closeEditorButton: document.querySelector("#closeEditorButton"),
    editButton: document.querySelector("#editButton"),
    titleInput: document.querySelector("#titleInput"),
    artistInput: document.querySelector("#artistInput"),
    bodyInput: document.querySelector("#bodyInput"),
    lineEditor: document.querySelector("#lineEditor"),
    statusLine: document.querySelector("#statusLine"),
    songForm: document.querySelector("#songForm"),
    addLineButton: document.querySelector("#addLineButton"),
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
    renderLineEditor(song.body || "", state.chords);
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
        state.chords = state.selected.chords.map(chord => ({...chord}));
        fillForm(state.selected);
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
        state.chords = state.selected.chords.map(chord => ({...chord}));
        fillForm(state.selected);
    }
    renderAll();
}

function renderAll() {
    const hasSelection = Boolean(state.selected);
    const title = hasSelection ? state.selected.title : "Chordify";
    els.songTitle.textContent = title;
    els.artistLabel.textContent = hasSelection ? state.selected.artist || "" : "";
    els.emptyState.hidden = hasSelection;
    els.songWorkspace.hidden = !hasSelection;
    els.songWorkspace.classList.toggle("song-workspace--no-chords", !hasSelection || state.selected.chords.length === 0);
    els.editButton.hidden = !hasSelection;
    els.deleteButton.hidden = !hasSelection;
    renderSongList();
    renderSongView();
    renderChordPanel();
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

function renderChordPanel() {
    if (!state.selected) {
        els.chordPanel.hidden = true;
        els.chordPanel.replaceChildren();
        return;
    }
    const chordNames = uniqueChordSymbols(state.selected.chords);
    if (chordNames.length === 0) {
        els.chordPanel.hidden = true;
        els.chordPanel.replaceChildren();
        return;
    }
    els.chordPanel.hidden = false;
    const title = document.createElement("h2");
    title.textContent = "Аккорды";
    const grid = document.createElement("div");
    grid.className = "chord-panel__grid";
    grid.replaceChildren(...chordNames.map(symbol => createChordDiagram(symbol)));
    els.chordPanel.replaceChildren(title, grid);
}

function uniqueChordSymbols(chords) {
    const seen = new Set();
    return chords
        .map(chord => chord.symbol)
        .filter(symbol => {
            const normalized = normalizeChordSymbol(symbol);
            if (seen.has(normalized)) {
                return false;
            }
            seen.add(normalized);
            return true;
        });
}

function normalizeChordSymbol(symbol) {
    return symbol.replace(/\/[A-GH][#b]?$/, "");
}

function createChordDiagram(symbol) {
    const card = document.createElement("article");
    card.className = "chord-card";
    const name = document.createElement("h3");
    name.textContent = symbol;
    const normalized = normalizeChordSymbol(symbol);
    const diagram = CHORD_DIAGRAMS[normalized] || null;
    const svg = diagram ? renderChordSvg(diagram) : renderUnknownChordSvg();
    card.append(name, svg);
    return card;
}

function renderChordSvg(diagram) {
    const svg = createSvgElement("svg", {
        class: "chord-diagram",
        viewBox: "0 0 132 148",
        role: "img",
        "aria-label": "Схема аккорда"
    });
    const stringXs = [18, 37, 56, 75, 94, 113];
    const fretYs = [41, 62, 83, 104, 125];
    const topY = 20;
    const bottomY = 125;
    const base = diagram.base || 1;

    if (base === 1) {
        svg.append(createSvgElement("line", {class: "chord-diagram__nut", x1: 18, y1: topY, x2: 113, y2: topY}));
    } else {
        svg.append(createSvgElement("text", {class: "chord-diagram__base", x: 4, y: 47}, `${base}fr`));
        svg.append(createSvgElement("line", {class: "chord-diagram__fret", x1: 18, y1: topY, x2: 113, y2: topY}));
    }
    stringXs.forEach(x => svg.append(createSvgElement("line", {class: "chord-diagram__string", x1: x, y1: topY, x2: x, y2: bottomY})));
    fretYs.forEach(y => svg.append(createSvgElement("line", {class: "chord-diagram__fret", x1: 18, y1: y, x2: 113, y2: y})));

    if (diagram.barre) {
        const y = fretCenterY(diagram.barre.fret);
        svg.append(createSvgElement("line", {
            class: "chord-diagram__barre",
            x1: stringXs[diagram.barre.from],
            y1: y,
            x2: stringXs[diagram.barre.to],
            y2: y
        }));
    }

    diagram.frets.forEach((fret, stringIndex) => {
        const x = stringXs[stringIndex];
        if (fret === "x" || fret === 0) {
            svg.append(createSvgElement("text", {class: "chord-diagram__marker", x, y: 14}, fret === "x" ? "x" : "o"));
            return;
        }
        if (diagram.barre?.fret === fret && stringIndex >= diagram.barre.from && stringIndex <= diagram.barre.to) {
            return;
        }
        const y = fretCenterY(fret);
        svg.append(createSvgElement("circle", {class: "chord-diagram__dot", cx: x, cy: y, r: 7}));
        const finger = diagram.fingers?.[stringIndex];
        if (finger) {
            svg.append(createSvgElement("text", {class: "chord-diagram__finger", x, y: y + 3}, finger));
        }
    });
    return svg;
}

function fretCenterY(fret) {
    return 20 + (fret - 0.5) * 21;
}

function renderUnknownChordSvg() {
    const svg = createSvgElement("svg", {
        class: "chord-diagram chord-diagram--unknown",
        viewBox: "0 0 132 148",
        role: "img",
        "aria-label": "Схема аккорда не найдена"
    });
    svg.append(createSvgElement("text", {x: 66, y: 70}, "?"));
    svg.append(createSvgElement("text", {x: 66, y: 94}, "нет схемы"));
    return svg;
}

function createSvgElement(tag, attrs, text = "") {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    element.textContent = text;
    return element;
}

function renderLineEditor(body, chords) {
    const lines = normalizeText(body).split("\n");
    const byLine = groupChordsByLine(chords);
    const rows = lines.map((line, lineIndex) => createEditorRow(line, chordInputValue(line, byLine.get(lineIndex) || [])));
    els.lineEditor.replaceChildren(...rows);
    refreshEditorLineNumbers();
    syncEditorToState();
}

function createEditorRow(line, chordLine) {
    const row = document.createElement("div");
    row.className = "line-editor__row";

    const number = document.createElement("div");
    number.className = "line-editor__number";

    const fields = document.createElement("div");
    fields.className = "line-editor__fields";

    const chordInput = document.createElement("input");
    chordInput.className = "line-editor__chords";
    chordInput.placeholder = "Am";
    chordInput.value = chordLine;
    chordInput.autocomplete = "off";
    chordInput.spellcheck = false;
    chordInput.addEventListener("input", syncEditorToState);
    chordInput.addEventListener("keydown", handleEditorLineKeydown);

    const lyricInput = document.createElement("input");
    lyricInput.className = "line-editor__lyrics";
    lyricInput.value = line;
    lyricInput.autocomplete = "off";
    lyricInput.spellcheck = false;
    lyricInput.addEventListener("input", syncEditorToState);
    lyricInput.addEventListener("keydown", handleEditorLineKeydown);

    fields.append(chordInput, lyricInput);

    const remove = document.createElement("button");
    remove.className = "icon-button danger";
    remove.type = "button";
    remove.title = "Удалить строку";
    remove.textContent = "×";
    remove.addEventListener("click", () => {
        if (els.lineEditor.children.length === 1) {
            chordInput.value = "";
            lyricInput.value = "";
        } else {
            row.remove();
        }
        syncEditorToState();
        refreshEditorLineNumbers();
    });

    row.append(number, fields, remove);
    return row;
}

function chordInputValue(line, chords) {
    if (chords.length === 0) {
        return "";
    }
    const columns = [];
    chords
        .slice()
        .sort((a, b) => a.charIndex - b.charIndex || a.sortOrder - b.sortOrder)
        .forEach(chord => {
            let index = Math.min(chord.charIndex, line.length);
            while (columns.slice(index, index + chord.symbol.length).some(Boolean)) {
                index += 1;
            }
            [...chord.symbol].forEach((char, offset) => {
                columns[index + offset] = char;
            });
        });
    return Array.from({length: columns.length}, (_, index) => columns[index] || " ").join("").trimEnd();
}

function handleEditorLineKeydown(event) {
    if (event.key === "Tab") {
        event.preventDefault();
        insertTab(event.currentTarget, event.shiftKey);
        syncEditorToState();
        return;
    }
    if (event.key !== "Enter") {
        return;
    }
    event.preventDefault();
    const currentRow = event.currentTarget.closest(".line-editor__row");
    addEditorLineAfter(currentRow);
}

function insertTab(input, shouldOutdent) {
    const {selectionStart, selectionEnd, value} = input;
    if (shouldOutdent) {
        const beforeSelection = value.slice(0, selectionStart);
        const indentMatch = beforeSelection.match(/(\t| {1,4})$/);
        if (!indentMatch) {
            return;
        }
        const start = selectionStart - indentMatch[0].length;
        input.setRangeText("", start, selectionStart, "end");
        input.selectionStart = start;
        input.selectionEnd = start + (selectionEnd - selectionStart);
        return;
    }
    input.setRangeText("\t", selectionStart, selectionEnd, "end");
}

function parseSongText() {
    const parsed = parseChordText(els.bodyInput.value);
    state.chords = parsed.chords;
    renderLineEditor(parsed.body, parsed.chords);
    setStatus(parsed.chords.length > 0
        ? `Найдено аккордов: ${parsed.chords.length}`
        : "Аккорды не найдены");
    els.bodyInput.value = parsed.body;
}

function addEditorLineAfter(row = null) {
    const newRow = createEditorRow("", "");
    if (row?.nextSibling) {
        els.lineEditor.insertBefore(newRow, row.nextSibling);
    } else if (row) {
        els.lineEditor.append(newRow);
    } else {
        els.lineEditor.append(newRow);
    }
    refreshEditorLineNumbers();
    syncEditorToState();
    newRow.querySelector(".line-editor__lyrics").focus();
}

function refreshEditorLineNumbers() {
    els.lineEditor.querySelectorAll(".line-editor__row").forEach((row, index) => {
        row.querySelector(".line-editor__number").textContent = index + 1;
    });
}

function syncEditorToState() {
    const rows = [...els.lineEditor.querySelectorAll(".line-editor__row")];
    const lines = rows.map(row => row.querySelector(".line-editor__lyrics").value);
    const chords = [];
    rows.forEach((row, lineIndex) => {
        const chordLine = expandTabs(row.querySelector(".line-editor__chords").value);
        extractChordLinePositions(chordLine, lines[lineIndex]).forEach(chord => {
            chords.push({
                id: null,
                lineIndex,
                charIndex: chord.charIndex,
                symbol: chord.symbol,
                sortOrder: chords.length
            });
        });
    });
    state.chords = chords;
    els.bodyInput.value = lines.join("\n");
}

function normalizeText(value) {
    return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
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
    syncEditorToState();
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
els.addLineButton.addEventListener("click", () => addEditorLineAfter());
els.parseSongButton.addEventListener("click", parseSongText);
els.songForm.addEventListener("submit", saveSong);
els.deleteButton.addEventListener("click", deleteSong);

loadSongs().then(() => {
    renderAll();
}).catch(error => setStatus(error.message));
