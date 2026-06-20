package com.example.chordstorer.song;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class SongService {

    private final SongRepository songRepository;

    public SongService(SongRepository songRepository) {
        this.songRepository = songRepository;
    }

    public List<SongSummary> findAll() {
        return songRepository.findAll();
    }

    public Song get(long id) {
        return songRepository.findById(id)
                .orElseThrow(() -> new SongNotFoundException(id));
    }

    public Song create(SongRequest request) {
        return songRepository.create(validate(request));
    }

    public Song update(long id, SongRequest request) {
        return songRepository.update(id, validate(request))
                .orElseThrow(() -> new SongNotFoundException(id));
    }

    public void delete(long id) {
        if (!songRepository.delete(id)) {
            throw new SongNotFoundException(id);
        }
    }

    private SongRequest validate(SongRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Song payload is required");
        }
        if (request.title() == null || request.title().isBlank()) {
            throw new IllegalArgumentException("Title is required");
        }
        String body = request.body() == null ? "" : request.body().replace("\r\n", "\n").replace('\r', '\n');
        String[] lines = body.split("\n", -1);
        List<ChordPosition> chords = new ArrayList<>();
        if (request.chords() != null) {
            for (ChordPosition chord : request.chords()) {
                validateChord(chord, lines);
                chords.add(new ChordPosition(
                        null,
                        chord.lineIndex(),
                        chord.charIndex(),
                        chord.symbol().trim(),
                        chord.sortOrder()
                ));
            }
        }
        chords.sort(Comparator
                .comparingInt(ChordPosition::lineIndex)
                .thenComparingInt(ChordPosition::charIndex)
                .thenComparingInt(ChordPosition::sortOrder));
        return new SongRequest(request.title().trim(), request.artist(), body, chords);
    }

    private static void validateChord(ChordPosition chord, String[] lines) {
        if (chord == null) {
            throw new IllegalArgumentException("Chord cannot be empty");
        }
        if (chord.symbol() == null || chord.symbol().isBlank()) {
            throw new IllegalArgumentException("Chord symbol is required");
        }
        if (chord.lineIndex() < 0 || chord.lineIndex() >= lines.length) {
            throw new IllegalArgumentException("Chord line is outside the song text");
        }
        if (chord.charIndex() < 0 || chord.charIndex() > lines[chord.lineIndex()].length()) {
            throw new IllegalArgumentException("Chord character position is outside the line");
        }
    }
}
