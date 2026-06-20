package com.example.chordstorer.song;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class SongRepository {

    private final JdbcTemplate jdbcTemplate;

    public SongRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<SongSummary> findAll() {
        return jdbcTemplate.query("""
                SELECT s.id, s.title, s.artist, COUNT(c.id) AS chord_count, s.updated_at
                FROM songs s
                LEFT JOIN chords c ON c.song_id = s.id
                WHERE s.deleted_at IS NULL
                GROUP BY s.id
                ORDER BY lower(s.title)
                """, (rs, rowNum) -> new SongSummary(
                rs.getLong("id"),
                rs.getString("title"),
                rs.getString("artist"),
                rs.getInt("chord_count"),
                Instant.parse(rs.getString("updated_at"))
        ));
    }

    public Optional<Song> findById(long id) {
        try {
            Song song = jdbcTemplate.queryForObject("""
                    SELECT id, title, artist, body, created_at, updated_at
                    FROM songs
                    WHERE id = ? AND deleted_at IS NULL
                    """, (rs, rowNum) -> new Song(
                    rs.getLong("id"),
                    rs.getString("title"),
                    rs.getString("artist"),
                    rs.getString("body"),
                    findChords(id),
                    Instant.parse(rs.getString("created_at")),
                    Instant.parse(rs.getString("updated_at"))
            ), id);
            return Optional.ofNullable(song);
        } catch (EmptyResultDataAccessException ex) {
            return Optional.empty();
        }
    }

    @Transactional
    public Song create(SongRequest request) {
        String now = Instant.now().toString();
        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement("""
                    INSERT INTO songs(title, artist, body, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, request.title().trim());
            ps.setString(2, blankToNull(request.artist()));
            ps.setString(3, normalizeBody(request.body()));
            ps.setString(4, now);
            ps.setString(5, now);
            return ps;
        }, keyHolder);
        long id = keyHolder.getKey().longValue();
        replaceChords(id, request.chords());
        return findById(id).orElseThrow();
    }

    @Transactional
    public Optional<Song> update(long id, SongRequest request) {
        String now = Instant.now().toString();
        int updated = jdbcTemplate.update("""
                UPDATE songs
                SET title = ?, artist = ?, body = ?, updated_at = ?
                WHERE id = ?
                """, request.title().trim(), blankToNull(request.artist()), normalizeBody(request.body()), now, id);
        if (updated == 0) {
            return Optional.empty();
        }
        replaceChords(id, request.chords());
        return findById(id);
    }

    @Transactional
    public boolean delete(long id) {
        String now = Instant.now().toString();
        return jdbcTemplate.update("""
                UPDATE songs
                SET deleted_at = ?, updated_at = ?
                WHERE id = ? AND deleted_at IS NULL
                """, now, now, id) > 0;
    }

    private List<ChordPosition> findChords(long songId) {
        return jdbcTemplate.query("""
                SELECT id, line_index, char_index, symbol, sort_order
                FROM chords
                WHERE song_id = ?
                ORDER BY line_index, char_index, sort_order
                """, (rs, rowNum) -> new ChordPosition(
                rs.getLong("id"),
                rs.getInt("line_index"),
                rs.getInt("char_index"),
                rs.getString("symbol"),
                rs.getInt("sort_order")
        ), songId);
    }

    private void replaceChords(long songId, List<ChordPosition> chords) {
        jdbcTemplate.update("DELETE FROM chords WHERE song_id = ?", songId);
        if (chords == null || chords.isEmpty()) {
            return;
        }
        for (int i = 0; i < chords.size(); i++) {
            ChordPosition chord = chords.get(i);
            jdbcTemplate.update("""
                    INSERT INTO chords(song_id, line_index, char_index, symbol, sort_order)
                    VALUES (?, ?, ?, ?, ?)
                    """, songId, chord.lineIndex(), chord.charIndex(), chord.symbol().trim(), i);
        }
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static String normalizeBody(String body) {
        return body == null ? "" : body.replace("\r\n", "\n").replace('\r', '\n');
    }
}
