package com.example.chordify.song;

import java.util.List;

public record SongRequest(
        String title,
        String artist,
        String body,
        List<ChordPosition> chords
) {
}
