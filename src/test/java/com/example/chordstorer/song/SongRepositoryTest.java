package com.example.chordstorer.song;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

class SongRepositoryTest {

    private SingleConnectionDataSource dataSource;
    private JdbcTemplate jdbcTemplate;
    private SongRepository repository;

    @BeforeEach
    void setUp() {
        dataSource = new SingleConnectionDataSource("jdbc:sqlite::memory:", true);
        jdbcTemplate = new JdbcTemplate(dataSource);
        repository = new SongRepository(jdbcTemplate);
        createSchema();
    }

    @AfterEach
    void tearDown() {
        dataSource.destroy();
    }

    @Test
    void deleteMarksSongAsDeletedAndHidesItFromNormalReads() {
        Song song = repository.create(new SongRequest(
                "Test",
                "Artist",
                "hello",
                List.of(new ChordPosition(null, 0, 0, "Am", 0))
        ));

        assertThat(repository.delete(song.id())).isTrue();

        assertThat(repository.findAll()).isEmpty();
        assertThat(repository.findById(song.id())).isEmpty();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT deleted_at IS NOT NULL FROM songs WHERE id = ?",
                Boolean.class,
                song.id()
        )).isTrue();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM chords WHERE song_id = ?",
                Integer.class,
                song.id()
        )).isEqualTo(1);
    }

    @Test
    void deleteReturnsFalseForAlreadyDeletedSong() {
        Song song = repository.create(new SongRequest("Test", "", "", List.of()));

        assertThat(repository.delete(song.id())).isTrue();
        assertThat(repository.delete(song.id())).isFalse();
    }

    private void createSchema() {
        jdbcTemplate.execute("""
                CREATE TABLE songs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    artist TEXT,
                    body TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    deleted_at TEXT
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE chords (
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
    }
}
