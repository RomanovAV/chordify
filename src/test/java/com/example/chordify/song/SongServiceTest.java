package com.example.chordify.song;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.Test;

class SongServiceTest {

    @Test
    void rejectsChordOutsideLine() {
        SongService service = new SongService(null);
        SongRequest request = new SongRequest(
                "Test",
                "",
                "hello",
                List.of(new ChordPosition(null, 0, 99, "Am", 0))
        );

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("outside the line");
    }
}
