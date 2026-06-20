package com.example.chordstorer.song;

public record ChordPosition(
        Long id,
        int lineIndex,
        int charIndex,
        String symbol,
        int sortOrder
) {
}
