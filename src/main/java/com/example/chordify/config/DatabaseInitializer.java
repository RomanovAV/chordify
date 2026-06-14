package com.example.chordify.config;

import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

@Component
public class DatabaseInitializer {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    void initialize() throws Exception {
        Files.createDirectories(Path.of("data"));
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS songs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    artist TEXT,
                    body TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS chords (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    song_id INTEGER NOT NULL,
                    line_index INTEGER NOT NULL,
                    char_index INTEGER NOT NULL,
                    symbol TEXT NOT NULL,
                    sort_order INTEGER NOT NULL,
                    FOREIGN KEY(song_id) REFERENCES songs(id) ON DELETE CASCADE,
                    CHECK(line_index >= 0),
                    CHECK(char_index >= 0)
                )
                """);
        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS idx_chords_song_position
                ON chords(song_id, line_index, char_index, sort_order)
                """);
    }
}
