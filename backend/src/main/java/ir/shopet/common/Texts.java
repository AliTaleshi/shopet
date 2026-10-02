package ir.shopet.common;

import java.util.regex.Pattern;

/** Helpers for normalizing Persian user input. */
public final class Texts {

    private static final Pattern MOBILE = Pattern.compile("^09\\d{9}$");

    private Texts() {
    }

    /** Converts Persian/Arabic digits to ASCII digits. */
    public static String toLatinDigits(String input) {
        if (input == null) {
            return null;
        }
        StringBuilder sb = new StringBuilder(input.length());
        for (char c : input.toCharArray()) {
            if (c >= '۰' && c <= '۹') {
                sb.append((char) ('0' + (c - '۰')));
            } else if (c >= '٠' && c <= '٩') {
                sb.append((char) ('0' + (c - '٠')));
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    /** Replaces Arabic yeh/kaf with their Persian forms so searches match. */
    public static String normalizePersian(String input) {
        if (input == null) {
            return null;
        }
        return input.replace('ي', 'ی').replace('ك', 'ک').trim();
    }

    /** Normalizes an Iranian mobile number to the 09xxxxxxxxx form, or returns null if invalid. */
    public static String normalizeMobile(String input) {
        if (input == null) {
            return null;
        }
        String phone = toLatinDigits(input).replaceAll("[\\s-]", "");
        if (phone.startsWith("+98")) {
            phone = "0" + phone.substring(3);
        } else if (phone.startsWith("0098")) {
            phone = "0" + phone.substring(4);
        } else if (phone.startsWith("98") && phone.length() == 12) {
            phone = "0" + phone.substring(2);
        } else if (phone.startsWith("9") && phone.length() == 10) {
            phone = "0" + phone;
        }
        return MOBILE.matcher(phone).matches() ? phone : null;
    }
}
