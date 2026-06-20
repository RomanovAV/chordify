package com.example.chordstorer.song;

import java.time.Instant;
import java.util.List;

public record Song(
        Long id,
        String title,
        String artist,
        String body,
        List<ChordPosition> chords,
        Instant createdAt,
        Instant updatedAt
) {
}
