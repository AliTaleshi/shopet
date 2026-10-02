package ir.shopet.storage;

import java.time.Duration;

import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class FileController {

    private final FileStorageService storage;

    public FileController(FileStorageService storage) {
        this.storage = storage;
    }

    @GetMapping("/api/files/{name}")
    public ResponseEntity<Resource> file(@PathVariable String name) {
        return storage.load(name)
                .map(resource -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(FileStorageService.contentType(name)))
                        .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic())
                        .body(resource))
                .orElse(ResponseEntity.notFound().build());
    }
}
