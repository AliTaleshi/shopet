package ir.shopet.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import ir.shopet.common.ApiException;
import ir.shopet.config.AppProperties;

/** Stores uploaded images on the local disk (a docker volume in production). */
@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp",
            "image/gif", "gif");
    private static final Pattern SAFE_NAME = Pattern.compile("^[a-f0-9]{32}\\.(jpg|png|webp|gif)$");

    private final Path root;

    public FileStorageService(AppProperties props) throws IOException {
        this.root = Path.of(props.uploadDir()).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    public String store(MultipartFile file) {
        String extension = EXTENSIONS.get(file.getContentType());
        if (extension == null || file.isEmpty()) {
            throw ApiException.badRequest("فقط تصاویر JPG، PNG، WEBP یا GIF مجاز هستند.");
        }
        try {
            return store(file.getBytes(), extension);
        } catch (IOException e) {
            throw ApiException.badRequest("خواندن فایل ممکن نشد.");
        }
    }

    /**
     * Stores image bytes under a new random name; {@code extension} is one of jpg, png, webp, gif. Inside a
     * transaction the file is removed again if the transaction rolls back, so failed uploads leave no orphans.
     */
    public String store(byte[] data, String extension) {
        if (!looksLikeImage(data, extension)) {
            throw ApiException.badRequest("محتوای فایل تصویر معتبر نیست.");
        }
        String name = UUID.randomUUID().toString().replace("-", "") + "." + extension;
        try {
            Files.write(root.resolve(name), data);
        } catch (IOException e) {
            throw new IllegalStateException("Could not store file", e);
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED) {
                        delete(name);
                    }
                }
            });
        }
        return name;
    }

    /** Deletes the file once the surrounding transaction commits (immediately when there is none). */
    public void deleteAfterCommit(String name) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            delete(name);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                delete(name);
            }
        });
    }

    public Optional<Resource> load(String name) {
        if (!SAFE_NAME.matcher(name).matches()) {
            return Optional.empty();
        }
        Path path = root.resolve(name);
        return Files.isRegularFile(path) ? Optional.of(new PathResource(path)) : Optional.empty();
    }

    public void delete(String name) {
        if (!SAFE_NAME.matcher(name).matches()) {
            return;
        }
        try {
            Files.deleteIfExists(root.resolve(name));
        } catch (IOException e) {
            log.warn("Could not delete file {}", name, e);
        }
    }

    public static String contentType(String name) {
        return EXTENSIONS.entrySet().stream()
                .filter(e -> name.endsWith("." + e.getValue()))
                .map(Map.Entry::getKey)
                .findFirst()
                .orElse("application/octet-stream");
    }

    /** Checks the file's magic bytes so a renamed non-image is rejected. */
    private static boolean looksLikeImage(byte[] h, String extension) {
        return switch (extension) {
            case "jpg" -> h.length >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF;
            case "png" -> h.length >= 4 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G';
            case "gif" -> h.length >= 3 && h[0] == 'G' && h[1] == 'I' && h[2] == 'F';
            case "webp" -> h.length >= 12 && h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                    && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P';
            default -> false;
        };
    }
}
