package ir.shopet.common;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class TextsTest {

    @ParameterizedTest
    @CsvSource({
            "09123456789, 09123456789",
            "۰۹۱۲۳۴۵۶۷۸۹, 09123456789",
            "+989123456789, 09123456789",
            "00989123456789, 09123456789",
            "989123456789, 09123456789",
            "9123456789, 09123456789",
            "0912 345 6789, 09123456789"
    })
    void normalizesValidMobiles(String input, String expected) {
        assertThat(Texts.normalizeMobile(input)).isEqualTo(expected);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "0812345678", "0912345678", "091234567890", "abc"})
    void rejectsInvalidMobiles(String input) {
        assertThat(Texts.normalizeMobile(input)).isNull();
    }

    @org.junit.jupiter.api.Test
    void normalizesArabicLetters() {
        assertThat(Texts.normalizePersian(" كيك ")).isEqualTo("کیک");
    }
}
