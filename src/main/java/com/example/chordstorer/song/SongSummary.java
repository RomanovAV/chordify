package com.example.chordstorer.song;

import java.time.Instant;

public record SongSummary(
        Long id,
        String title,
        String artist,
        int chordCount,
        Instant updatedAt
) {
}
