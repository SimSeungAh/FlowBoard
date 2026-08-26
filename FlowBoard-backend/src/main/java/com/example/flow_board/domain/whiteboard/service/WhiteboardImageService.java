package com.example.flow_board.domain.whiteboard.service;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.repository.BoardRepository;
import com.example.flow_board.domain.board.service.BoardPermissionService;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.domain.whiteboard.dto.response.WhiteboardObjectResponse;
import com.example.flow_board.domain.whiteboard.entity.Whiteboard;
import com.example.flow_board.domain.whiteboard.entity.WhiteboardObject;
import com.example.flow_board.domain.whiteboard.entity.WhiteboardObjectType;
import com.example.flow_board.domain.whiteboard.repository.WhiteboardObjectRepository;
import com.example.flow_board.domain.whiteboard.repository.WhiteboardRepository;
import com.example.flow_board.domain.whiteboard.websocket.WhiteboardEventPublisher;
import com.example.flow_board.domain.whiteboard.websocket.WhiteboardWebSocketEvent;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@Transactional(readOnly = true)
public class WhiteboardImageService {

  private static final long MAX_IMAGE_BYTES = 10L * 1024L * 1024L;
  private static final double MAX_DISPLAY_WIDTH = 720.0;
  private static final double MAX_DISPLAY_HEIGHT = 520.0;
  private static final double MIN_DISPLAY_SIZE = 48.0;

  private static final Map<String, String> EXTENSION_BY_CONTENT_TYPE = Map.of(
      "image/png", "png",
      "image/jpeg", "jpg",
      "image/gif", "gif"
  );

  private final BoardRepository boardRepository;
  private final BoardPermissionService boardPermissionService;
  private final WhiteboardRepository whiteboardRepository;
  private final WhiteboardObjectRepository whiteboardObjectRepository;
  private final WhiteboardEventPublisher whiteboardEventPublisher;
  private final JsonMapper jsonMapper;
  private final Path rootDirectory;

  public WhiteboardImageService(
      BoardRepository boardRepository,
      BoardPermissionService boardPermissionService,
      WhiteboardRepository whiteboardRepository,
      WhiteboardObjectRepository whiteboardObjectRepository,
      WhiteboardEventPublisher whiteboardEventPublisher,
      JsonMapper jsonMapper,
      @Value("${flowboard.whiteboard.upload-dir:./uploads/whiteboards}") String uploadDirectory
  ) {
    this.boardRepository = boardRepository;
    this.boardPermissionService = boardPermissionService;
    this.whiteboardRepository = whiteboardRepository;
    this.whiteboardObjectRepository = whiteboardObjectRepository;
    this.whiteboardEventPublisher = whiteboardEventPublisher;
    this.jsonMapper = jsonMapper;
    this.rootDirectory = Path.of(uploadDirectory).toAbsolutePath().normalize();
  }

  @Transactional
  public WhiteboardObjectResponse uploadImage(
      User user,
      Long boardId,
      Long whiteboardId,
      MultipartFile file
  ) {
    Board board = getBoardById(boardId);
    boardPermissionService.validateWritePermission(board, user);

    Whiteboard whiteboard = getWhiteboardInBoard(board, whiteboardId);
    validateWhiteboardEditable(whiteboard);

    ValidatedImage validated = validateImage(file);

    Path directory = resolveWhiteboardDirectory(boardId, whiteboardId);
    String storedFileName =
        UUID.randomUUID() + "." + validated.extension();

    Path target =
        directory.resolve(storedFileName).normalize();

    if (!target.startsWith(directory)) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT
      );
    }

    try {
      Files.createDirectories(directory);

      try (
          InputStream inputStream =
              file.getInputStream()
      ) {
        Files.copy(
            inputStream,
            target,
            StandardCopyOption.REPLACE_EXISTING
        );
      }

    } catch (IOException exception) {
      log.error(
          "화이트보드 이미지 파일 저장 실패. boardId={}, whiteboardId={}",
          boardId,
          whiteboardId,
          exception
      );

      throw new CustomException(
          ErrorCode.WHITEBOARD_DATA_PROCESSING_FAILED
      );
    }

    String originalName =
        normalizeOriginalName(
            file.getOriginalFilename(),
            validated.extension()
        );

    DisplaySize displaySize =
        calculateDisplaySize(
            validated.width(),
            validated.height(),
            whiteboard.getCanvasWidth(),
            whiteboard.getCanvasHeight()
        );

    double x =
        Math.max(
            0.0,
            (
                whiteboard.getCanvasWidth()
                    - displaySize.width()
            ) / 2.0
        );

    double y =
        Math.max(
            0.0,
            (
                whiteboard.getCanvasHeight()
                    - displaySize.height()
            ) / 2.0
        );

    ImageMetadata metadata =
        new ImageMetadata(
            storedFileName,
            originalName,
            validated.contentType(),
            file.getSize(),
            validated.width(),
            validated.height()
        );

    String propertiesJson =
        writeMetadata(
            metadata
        );

    int zIndex =
        getNextZIndex(
            whiteboard
        );

    WhiteboardObject object =
        new WhiteboardObject(
            whiteboard,
            user,
            UUID.randomUUID().toString(),
            WhiteboardObjectType.IMAGE,
            x,
            y,
            displaySize.width(),
            displaySize.height(),
            0.0,
            originalName,
            null,
            null,
            null,
            null,
            zIndex,
            propertiesJson
        );

    try {
      WhiteboardObject saved =
          whiteboardObjectRepository.save(
              object
          );

      WhiteboardObjectResponse response =
          WhiteboardObjectResponse.from(
              saved
          );

      whiteboardEventPublisher.publish(
          WhiteboardWebSocketEvent.objectCreated(
              board.getId(),
              whiteboard.getId(),
              response
          )
      );

      return response;

    } catch (RuntimeException exception) {
      deletePathQuietly(
          target
      );

      throw exception;
    }
  }

  public ImageContent getImageContent(
      User user,
      Long boardId,
      Long whiteboardId,
      Long objectId
  ) {
    Board board =
        getBoardById(
            boardId
        );

    boardPermissionService.validateReadPermission(
        board,
        user
    );

    Whiteboard whiteboard =
        getWhiteboardInBoard(
            board,
            whiteboardId
        );

    WhiteboardObject object =
        getImageObject(
            whiteboard,
            objectId
        );

    ImageMetadata metadata =
        readMetadata(
            object.getPropertiesJson()
        );

    Path directory =
        resolveWhiteboardDirectory(
            boardId,
            whiteboardId
        );

    Path target =
        directory
            .resolve(
                metadata.storedFileName()
            )
            .normalize();

    if (
        !target.startsWith(directory)
            || !Files.isRegularFile(target)
    ) {
      throw new CustomException(
          ErrorCode.WHITEBOARD_DATA_PROCESSING_FAILED
      );
    }

    Resource resource =
        new FileSystemResource(
            target
        );

    return new ImageContent(
        resource,
        metadata.contentType(),
        metadata.fileSize(),
        metadata.originalName()
    );
  }

  public void deleteStoredImageQuietly(
      WhiteboardObject object
  ) {
    if (
        object.getType()
            != WhiteboardObjectType.IMAGE
    ) {
      return;
    }

    try {
      ImageMetadata metadata =
          readMetadata(
              object.getPropertiesJson()
          );

      Path directory =
          resolveWhiteboardDirectory(
              object
                  .getWhiteboard()
                  .getBoard()
                  .getId(),
              object
                  .getWhiteboard()
                  .getId()
          );

      Path target =
          directory
              .resolve(
                  metadata.storedFileName()
              )
              .normalize();

      if (
          target.startsWith(directory)
      ) {
        deletePathQuietly(
            target
        );
      }

    } catch (RuntimeException exception) {
      log.warn(
          "화이트보드 이미지 파일 정리에 실패했습니다. objectId={}",
          object.getId(),
          exception
      );
    }
  }

  public void deleteWhiteboardDirectoryQuietly(
      Long boardId,
      Long whiteboardId
  ) {
    deleteDirectoryTreeQuietly(
        resolveWhiteboardDirectory(
            boardId,
            whiteboardId
        )
    );
  }

  public void deleteBoardDirectoryQuietly(
      Long boardId
  ) {
    deleteDirectoryTreeQuietly(
        resolveBoardDirectory(
            boardId
        )
    );
  }

  private ValidatedImage validateImage(
      MultipartFile file
  ) {
    if (
        file == null
            || file.isEmpty()
    ) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT
      );
    }

    if (
        file.getSize() <= 0
            || file.getSize() > MAX_IMAGE_BYTES
    ) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT
      );
    }

    String contentType =
        file.getContentType();

    String extension =
        contentType == null
            ? null
            : EXTENSION_BY_CONTENT_TYPE.get(
            contentType.toLowerCase(
                Locale.ROOT
            )
        );

    if (
        extension == null
    ) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT
      );
    }

    try (
        InputStream inputStream =
            file.getInputStream()
    ) {
      BufferedImage image =
          ImageIO.read(
              inputStream
          );

      if (
          image == null
              || image.getWidth() <= 0
              || image.getHeight() <= 0
      ) {
        throw new CustomException(
            ErrorCode.INVALID_INPUT
        );
      }

      return new ValidatedImage(
          extension,
          contentType.toLowerCase(
              Locale.ROOT
          ),
          image.getWidth(),
          image.getHeight()
      );

    } catch (IOException exception) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT
      );
    }
  }

  private DisplaySize calculateDisplaySize(
      int originalWidth,
      int originalHeight,
      int canvasWidth,
      int canvasHeight
  ) {
    double maxWidth =
        Math.min(
            MAX_DISPLAY_WIDTH,
            Math.max(
                MIN_DISPLAY_SIZE,
                canvasWidth - 80.0
            )
        );

    double maxHeight =
        Math.min(
            MAX_DISPLAY_HEIGHT,
            Math.max(
                MIN_DISPLAY_SIZE,
                canvasHeight - 80.0
            )
        );

    double scale =
        Math.min(
            1.0,
            Math.min(
                maxWidth / originalWidth,
                maxHeight / originalHeight
            )
        );

    double width =
        originalWidth * scale;

    double height =
        originalHeight * scale;

    if (
        width < MIN_DISPLAY_SIZE
            || height < MIN_DISPLAY_SIZE
    ) {
      double growScale =
          Math.max(
              MIN_DISPLAY_SIZE
                  / Math.max(
                  1.0,
                  width
              ),
              MIN_DISPLAY_SIZE
                  / Math.max(
                  1.0,
                  height
              )
          );

      growScale =
          Math.min(
              growScale,
              Math.min(
                  maxWidth
                      / Math.max(
                      1.0,
                      width
                  ),
                  maxHeight
                      / Math.max(
                      1.0,
                      height
                  )
              )
          );

      width *= growScale;
      height *= growScale;
    }

    return new DisplaySize(
        Math.round(width),
        Math.round(height)
    );
  }

  private String normalizeOriginalName(
      String originalName,
      String extension
  ) {
    String cleaned =
        StringUtils.cleanPath(
            originalName == null
                ? ""
                : originalName
        ).trim();

    if (
        cleaned.isBlank()
            || cleaned.contains("..")
    ) {
      return "image." + extension;
    }

    return cleaned.length() > 240
        ? cleaned.substring(
        cleaned.length() - 240
    )
        : cleaned;
  }

  private String writeMetadata(
      ImageMetadata metadata
  ) {
    try {
      return jsonMapper.writeValueAsString(
          metadata
      );

    } catch (JacksonException exception) {
      throw new CustomException(
          ErrorCode.WHITEBOARD_DATA_PROCESSING_FAILED
      );
    }
  }

  private ImageMetadata readMetadata(
      String propertiesJson
  ) {
    if (
        propertiesJson == null
            || propertiesJson.isBlank()
    ) {
      throw new CustomException(
          ErrorCode.WHITEBOARD_DATA_PROCESSING_FAILED
      );
    }

    try {
      return jsonMapper.readValue(
          propertiesJson,
          ImageMetadata.class
      );

    } catch (JacksonException exception) {
      throw new CustomException(
          ErrorCode.WHITEBOARD_DATA_PROCESSING_FAILED
      );
    }
  }

  private int getNextZIndex(
      Whiteboard whiteboard
  ) {
    Integer maxZIndex =
        whiteboardObjectRepository
            .findMaxZIndexByWhiteboard(
                whiteboard
            );

    return maxZIndex == null
        ? 0
        : maxZIndex + 1;
  }

  private Board getBoardById(
      Long boardId
  ) {
    return boardRepository
        .findById(
            boardId
        )
        .orElseThrow(
            () ->
                new CustomException(
                    ErrorCode.BOARD_NOT_FOUND
                )
        );
  }

  private Whiteboard getWhiteboardInBoard(
      Board board,
      Long whiteboardId
  ) {
    return whiteboardRepository
        .findByIdAndBoard(
            whiteboardId,
            board
        )
        .orElseThrow(
            () ->
                new CustomException(
                    ErrorCode.WHITEBOARD_NOT_FOUND
                )
        );
  }

  private WhiteboardObject getImageObject(
      Whiteboard whiteboard,
      Long objectId
  ) {
    WhiteboardObject object =
        whiteboardObjectRepository
            .findByIdAndWhiteboard(
                objectId,
                whiteboard
            )
            .orElseThrow(
                () ->
                    new CustomException(
                        ErrorCode.INVALID_INPUT
                    )
            );

    if (
        object.getType()
            != WhiteboardObjectType.IMAGE
    ) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT
      );
    }

    return object;
  }

  private void validateWhiteboardEditable(
      Whiteboard whiteboard
  ) {
    if (
        whiteboard.isLocked()
    ) {
      throw new CustomException(
          ErrorCode.WHITEBOARD_LOCKED
      );
    }
  }

  private Path resolveBoardDirectory(
      Long boardId
  ) {
    Path directory =
        rootDirectory
            .resolve(
                String.valueOf(
                    boardId
                )
            )
            .normalize();

    if (
        !directory.startsWith(
            rootDirectory
        )
    ) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT
      );
    }

    return directory;
  }

  private Path resolveWhiteboardDirectory(
      Long boardId,
      Long whiteboardId
  ) {
    Path boardDirectory =
        resolveBoardDirectory(
            boardId
        );

    Path directory =
        boardDirectory
            .resolve(
                String.valueOf(
                    whiteboardId
                )
            )
            .normalize();

    if (
        !directory.startsWith(
            boardDirectory
        )
    ) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT
      );
    }

    return directory;
  }

  private void deletePathQuietly(
      Path path
  ) {
    try {
      Files.deleteIfExists(
          path
      );

    } catch (IOException exception) {
      log.warn(
          "파일 삭제 실패: {}",
          path,
          exception
      );
    }
  }

  private void deleteDirectoryTreeQuietly(
      Path directory
  ) {
    if (
        !Files.exists(
            directory
        )
    ) {
      return;
    }

    try (
        var paths =
            Files.walk(
                directory
            )
    ) {
      paths
          .sorted(
              (left, right) ->
                  right.getNameCount()
                      - left.getNameCount()
          )
          .forEach(
              this::deletePathQuietly
          );

    } catch (IOException exception) {
      log.warn(
          "화이트보드 이미지 디렉터리 정리 실패: {}",
          directory,
          exception
      );
    }
  }

  private record ValidatedImage(
      String extension,
      String contentType,
      int width,
      int height
  ) {
  }

  private record DisplaySize(
      double width,
      double height
  ) {
  }

  private record ImageMetadata(
      String storedFileName,
      String originalName,
      String contentType,
      long fileSize,
      int originalWidth,
      int originalHeight
  ) {
  }

  public record ImageContent(
      Resource resource,
      String contentType,
      long contentLength,
      String originalName
  ) {
  }
}