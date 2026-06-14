package com.example.chordify.song;

public class SongNotFoundException extends RuntimeException {

    public SongNotFoundException(long id) {
        super("Song " + id + " was not found");
    }
}
