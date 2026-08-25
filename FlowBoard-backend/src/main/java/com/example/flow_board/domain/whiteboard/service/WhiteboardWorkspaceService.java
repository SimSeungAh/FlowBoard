package com.example.flow_board.domain.whiteboard.service;

import com.example.flow_board.domain.activity.entity.ActivityType;
import com.example.flow_board.domain.activity.service.ActivityLogService;
import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.repository.BoardRepository;
import com.example.flow_board.domain.board.service.BoardPermissionService;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.domain.whiteboard.dto.request.WhiteboardRequests;
import com.example.flow_board.domain.whiteboard.dto.response.WhiteboardResponse;
import com.example.flow_board.domain.whiteboard.entity.Whiteboard;
import com.example.flow_board.domain.whiteboard.entity.WhiteboardGridType;
import com.example.flow_board.domain.whiteboard.repository.WhiteboardObjectRepository;
import com.example.flow_board.domain.whiteboard.repository.WhiteboardRepository;
import com.example.flow_board.domain.whiteboard.repository.WhiteboardStrokeRepository;
import com.example.flow_board.domain.whiteboard.websocket.WhiteboardEventPublisher;
import com.example.flow_board.domain.whiteboard.websocket.WhiteboardWebSocketEvent;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WhiteboardWorkspaceService {

  private static final String DEFAULT_WHITEBOARD_TITLE =
      "기본 화이트보드";

  private final BoardRepository boardRepository;
  private final BoardPermissionService boardPermissionService;
  private final WhiteboardRepository whiteboardRepository;
  private final WhiteboardStrokeRepository whiteboardStrokeRepository;
  private final WhiteboardObjectRepository whiteboardObjectRepository;
  private final ActivityLogService activityLogService;
  private final WhiteboardEventPublisher whiteboardEventPublisher;

  /**
   * 현재 보드의 화이트보드 목록을 조회합니다.
   *
   * OWNER / MEMBER / VIEWER 모두 가능합니다.
   *
   * 과거 보드처럼 아직 whiteboards 레코드가 하나도 없는 경우,
   * 최초 접근 시 시스템에서 기본 화이트보드를 하나 생성합니다.
   */
  @Transactional
  public List<WhiteboardResponse> getWhiteboards(
      User user,
      Long boardId
  ) {
    Board board = getBoardById(boardId);

    boardPermissionService.validateReadPermission(
        board,
        user
    );

    List<Whiteboard> whiteboards =
        ensureWhiteboardInitialized(board);

    return whiteboards
        .stream()
        .map(WhiteboardResponse::from)
        .toList();
  }

  /**
   * 화이트보드 상세 조회.
   */
  @Transactional
  public WhiteboardResponse getWhiteboard(
      User user,
      Long boardId,
      Long whiteboardId
  ) {
    Board board = getBoardById(boardId);

    boardPermissionService.validateReadPermission(
        board,
        user
    );

    ensureWhiteboardInitialized(board);

    Whiteboard whiteboard = getWhiteboardInBoard(
        board,
        whiteboardId
    );

    return WhiteboardResponse.from(whiteboard);
  }

  /**
   * 기본 화이트보드 조회.
   */
  @Transactional
  public WhiteboardResponse getDefaultWhiteboard(
      User user,
      Long boardId
  ) {
    Board board = getBoardById(boardId);

    boardPermissionService.validateReadPermission(
        board,
        user
    );

    List<Whiteboard> whiteboards =
        ensureWhiteboardInitialized(board);

    Whiteboard defaultWhiteboard =
        whiteboards
            .stream()
            .filter(Whiteboard::isDefaultWhiteboard)
            .findFirst()
            .orElse(whiteboards.get(0));

    return WhiteboardResponse.from(defaultWhiteboard);
  }

  /**
   * 새 화이트보드 생성.
   *
   * OWNER / MEMBER만 가능합니다.
   */
  @Transactional
  public WhiteboardResponse createWhiteboard(
      User user,
      Long boardId,
      WhiteboardRequests.Create request
  ) {
    Board board = getBoardById(boardId);

    boardPermissionService.validateWritePermission(
        board,
        user
    );

    List<Whiteboard> whiteboards =
        whiteboardRepository
            .findByBoardOrderByPositionAsc(board);

    int nextPosition =
        whiteboards
            .stream()
            .map(Whiteboard::getPosition)
            .filter(Objects::nonNull)
            .max(Integer::compareTo)
            .map(position -> position + 1)
            .orElse(0);

    boolean defaultWhiteboard =
        whiteboards.isEmpty();

    Whiteboard whiteboard =
        new Whiteboard(
            board,
            normalizeTitle(request.title()),
            normalizeDescription(request.description()),
            nextPosition,
            defaultWhiteboard
        );

    Whiteboard saved =
        whiteboardRepository.save(whiteboard);

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.WHITEBOARD_CREATED,
        saved.getId(),
        saved.getTitle(),
        user.getNickname()
            + "님이 '"
            + saved.getTitle()
            + "' 화이트보드를 생성했습니다."
    );

    return WhiteboardResponse.from(saved);
  }

  /**
   * 이름 / 설명 변경.
   */
  @Transactional
  public WhiteboardResponse updateWhiteboard(
      User user,
      Long boardId,
      Long whiteboardId,
      WhiteboardRequests.Update request
  ) {
    Board board = getBoardById(boardId);

    boardPermissionService.validateWritePermission(
        board,
        user
    );

    Whiteboard whiteboard = getWhiteboardInBoard(
        board,
        whiteboardId
    );

    String oldTitle = whiteboard.getTitle();

    whiteboard.updateMetadata(
        normalizeTitle(request.title()),
        normalizeDescription(request.description())
    );

    String description;

    if (Objects.equals(oldTitle, whiteboard.getTitle())) {
      description =
          user.getNickname()
              + "님이 '"
              + whiteboard.getTitle()
              + "' 화이트보드 정보를 수정했습니다.";
    } else {
      description =
          user.getNickname()
              + "님이 화이트보드 이름을 '"
              + oldTitle
              + "'에서 '"
              + whiteboard.getTitle()
              + "'(으)로 변경했습니다.";
    }

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.WHITEBOARD_UPDATED,
        whiteboard.getId(),
        whiteboard.getTitle(),
        description
    );

    return WhiteboardResponse.from(whiteboard);
  }

  /**
   * 배경색 / 그리드 표시 여부 변경.
   */
  @Transactional
  public WhiteboardResponse updateAppearance(
      User user,
      Long boardId,
      Long whiteboardId,
      WhiteboardRequests.Appearance request
  ) {
    Board board = getBoardById(boardId);

    boardPermissionService.validateWritePermission(
        board,
        user
    );

    Whiteboard whiteboard = getWhiteboardInBoard(
        board,
        whiteboardId
    );

    WhiteboardGridType gridType = resolveGridType(whiteboard, request);

    whiteboard.updateAppearance(
        normalizeBackgroundColor(request.backgroundColor()),
        gridType,
        request.gridSize() == null ? whiteboard.getGridSize() : request.gridSize(),
        request.gridOpacity() == null ? whiteboard.getGridOpacity() : request.gridOpacity()
    );

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.WHITEBOARD_UPDATED,
        whiteboard.getId(),
        whiteboard.getTitle(),
        user.getNickname()
            + "님이 '"
            + whiteboard.getTitle()
            + "' 화이트보드 표시 설정을 변경했습니다."
    );

    WhiteboardResponse response = WhiteboardResponse.from(whiteboard);

    whiteboardEventPublisher.publish(
        WhiteboardWebSocketEvent.workspaceUpdated(
            board.getId(),
            whiteboard.getId(),
            response
        )
    );

    return response;
  }

  /**
   * 화이트보드 잠금 / 잠금 해제.
   * 잠금 상태에서도 조회, 확대/축소, Pan은 가능하지만 데이터 수정은 차단합니다.
   */
  @Transactional
  public WhiteboardResponse updateLock(
      User user,
      Long boardId,
      Long whiteboardId,
      boolean locked
  ) {
    Board board = getBoardById(boardId);

    boardPermissionService.validateWritePermission(board, user);

    Whiteboard whiteboard = getWhiteboardInBoard(board, whiteboardId);
    whiteboard.updateLocked(locked);

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.WHITEBOARD_UPDATED,
        whiteboard.getId(),
        whiteboard.getTitle(),
        user.getNickname() + "님이 '" + whiteboard.getTitle() + "' 화이트보드를 "
            + (locked ? "잠갔습니다." : "잠금 해제했습니다.")
    );

    WhiteboardResponse response = WhiteboardResponse.from(whiteboard);

    whiteboardEventPublisher.publish(
        WhiteboardWebSocketEvent.workspaceUpdated(
            board.getId(),
            whiteboard.getId(),
            response
        )
    );

    return response;
  }

  /**
   * 기본 화이트보드 지정.
   *
   * 하나의 보드에는 하나의 기본 화이트보드만 존재하도록 합니다.
   */
  @Transactional
  public WhiteboardResponse setDefaultWhiteboard(
      User user,
      Long boardId,
      Long whiteboardId
  ) {
    Board board = getBoardById(boardId);

    boardPermissionService.validateWritePermission(
        board,
        user
    );

    List<Whiteboard> whiteboards =
        ensureWhiteboardInitialized(board);

    Whiteboard target =
        whiteboards
            .stream()
            .filter(whiteboard ->
                Objects.equals(
                    whiteboard.getId(),
                    whiteboardId
                )
            )
            .findFirst()
            .orElseThrow(
                () -> new CustomException(
                    ErrorCode.WHITEBOARD_NOT_FOUND
                )
            );

    boolean alreadyDefault =
        target.isDefaultWhiteboard()
            && whiteboards
            .stream()
            .filter(Whiteboard::isDefaultWhiteboard)
            .count() == 1;

    if (alreadyDefault) {
      return WhiteboardResponse.from(target);
    }

    for (Whiteboard whiteboard : whiteboards) {
      whiteboard.updateDefaultWhiteboard(
          Objects.equals(
              whiteboard.getId(),
              target.getId()
          )
      );
    }

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.WHITEBOARD_DEFAULT_CHANGED,
        target.getId(),
        target.getTitle(),
        user.getNickname()
            + "님이 '"
            + target.getTitle()
            + "' 화이트보드를 기본 화이트보드로 지정했습니다."
    );

    return WhiteboardResponse.from(target);
  }

  /**
   * 화이트보드 순서 변경.
   */
  @Transactional
  public List<WhiteboardResponse> reorderWhiteboards(
      User user,
      Long boardId,
      WhiteboardRequests.Reorder request
  ) {
    Board board = getBoardById(boardId);

    boardPermissionService.validateWritePermission(
        board,
        user
    );

    List<Whiteboard> currentWhiteboards =
        ensureWhiteboardInitialized(board);

    List<Long> requestedIds = request.whiteboardIds();

    validateWhiteboardOrder(
        currentWhiteboards,
        requestedIds
    );

    Map<Long, Whiteboard> whiteboardById =
        new HashMap<>();

    for (Whiteboard whiteboard : currentWhiteboards) {
      whiteboardById.put(
          whiteboard.getId(),
          whiteboard
      );
    }

    for (
        int index = 0;
        index < requestedIds.size();
        index += 1
    ) {
      Long whiteboardId = requestedIds.get(index);

      Whiteboard whiteboard =
          whiteboardById.get(whiteboardId);

      if (whiteboard == null) {
        throw new CustomException(
            ErrorCode.INVALID_WHITEBOARD_ORDER
        );
      }

      whiteboard.updatePosition(index);
    }

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.WHITEBOARD_UPDATED,
        board.getId(),
        "화이트보드 순서",
        user.getNickname()
            + "님이 화이트보드 순서를 변경했습니다."
    );

    return requestedIds
        .stream()
        .map(whiteboardById::get)
        .map(WhiteboardResponse::from)
        .toList();
  }

  /**
   * 화이트보드 삭제.
   *
   * 최소 1개의 화이트보드는 항상 유지합니다.
   *
   * 삭제 전에 해당 화이트보드의 Stroke와 편집 객체를 먼저 정리해
   * FK 오류가 발생하지 않도록 합니다.
   *
   * 기본 화이트보드를 삭제한 경우
   * 남아 있는 첫 번째 화이트보드를 새 기본값으로 지정합니다.
   */
  @Transactional
  public void deleteWhiteboard(
      User user,
      Long boardId,
      Long whiteboardId
  ) {
    Board board = getBoardById(boardId);

    boardPermissionService.validateWritePermission(
        board,
        user
    );

    List<Whiteboard> whiteboards =
        ensureWhiteboardInitialized(board);

    if (whiteboards.size() <= 1) {
      throw new CustomException(
          ErrorCode.LAST_WHITEBOARD_CANNOT_BE_DELETED
      );
    }

    Whiteboard target =
        whiteboards
            .stream()
            .filter(whiteboard ->
                Objects.equals(
                    whiteboard.getId(),
                    whiteboardId
                )
            )
            .findFirst()
            .orElseThrow(
                () -> new CustomException(
                    ErrorCode.WHITEBOARD_NOT_FOUND
                )
            );

    String deletedTitle = target.getTitle();
    boolean wasDefault = target.isDefaultWhiteboard();

    /*
     * Whiteboard를 삭제하기 전에
     * FK로 연결된 Canvas Stroke와 편집 객체를 먼저 제거합니다.
     */
    whiteboardStrokeRepository.deleteByWhiteboard(target);
    whiteboardObjectRepository.deleteByWhiteboard(target);

    whiteboardRepository.delete(target);

    List<Whiteboard> remaining =
        whiteboards
            .stream()
            .filter(whiteboard ->
                !Objects.equals(
                    whiteboard.getId(),
                    target.getId()
                )
            )
            .toList();

    normalizePositions(remaining);

    if (wasDefault) {
      for (
          int index = 0;
          index < remaining.size();
          index += 1
      ) {
        remaining
            .get(index)
            .updateDefaultWhiteboard(index == 0);
      }
    }

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.WHITEBOARD_DELETED,
        whiteboardId,
        deletedTitle,
        user.getNickname()
            + "님이 '"
            + deletedTitle
            + "' 화이트보드를 삭제했습니다."
    );
  }

  /**
   * 기존 보드 마이그레이션용 초기화.
   */
  private List<Whiteboard> ensureWhiteboardInitialized(
      Board board
  ) {
    List<Whiteboard> whiteboards =
        whiteboardRepository
            .findByBoardOrderByPositionAsc(board);

    if (whiteboards.isEmpty()) {
      Whiteboard defaultWhiteboard =
          new Whiteboard(
              board,
              DEFAULT_WHITEBOARD_TITLE,
              null,
              0,
              true
          );

      Whiteboard saved =
          whiteboardRepository.save(defaultWhiteboard);

      return List.of(saved);
    }

    boolean hasDefault =
        whiteboards
            .stream()
            .anyMatch(Whiteboard::isDefaultWhiteboard);

    if (!hasDefault) {
      whiteboards
          .get(0)
          .updateDefaultWhiteboard(true);
    }

    return whiteboards;
  }

  private void validateWhiteboardOrder(
      List<Whiteboard> currentWhiteboards,
      List<Long> requestedIds
  ) {
    if (currentWhiteboards.size() != requestedIds.size()) {
      throw new CustomException(
          ErrorCode.INVALID_WHITEBOARD_ORDER
      );
    }

    Set<Long> requestedIdSet =
        new HashSet<>(requestedIds);

    if (requestedIdSet.size() != requestedIds.size()) {
      throw new CustomException(
          ErrorCode.INVALID_WHITEBOARD_ORDER
      );
    }

    Set<Long> currentIdSet = new HashSet<>();

    for (Whiteboard whiteboard : currentWhiteboards) {
      currentIdSet.add(whiteboard.getId());
    }

    if (!currentIdSet.equals(requestedIdSet)) {
      throw new CustomException(
          ErrorCode.INVALID_WHITEBOARD_ORDER
      );
    }
  }

  private void normalizePositions(
      List<Whiteboard> whiteboards
  ) {
    for (
        int index = 0;
        index < whiteboards.size();
        index += 1
    ) {
      whiteboards
          .get(index)
          .updatePosition(index);
    }
  }

  private String normalizeTitle(
      String title
  ) {
    return title.trim();
  }

  private String normalizeDescription(
      String description
  ) {
    if (description == null) {
      return null;
    }

    String normalized = description.trim();

    return normalized.isEmpty()
        ? null
        : normalized;
  }

  private WhiteboardGridType resolveGridType(
      Whiteboard whiteboard,
      WhiteboardRequests.Appearance request
  ) {
    if (request.gridType() != null) {
      return request.gridType();
    }

    if (request.gridEnabled() != null) {
      if (!request.gridEnabled()) {
        return WhiteboardGridType.NONE;
      }

      return whiteboard.getGridType() == WhiteboardGridType.NONE
          ? WhiteboardGridType.GRID
          : whiteboard.getGridType();
    }

    return whiteboard.getGridType();
  }

  private String normalizeBackgroundColor(
      String backgroundColor
  ) {
    return backgroundColor.trim();
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
            () -> new CustomException(
                ErrorCode.WHITEBOARD_NOT_FOUND
            )
        );
  }

  private Board getBoardById(
      Long boardId
  ) {
    return boardRepository
        .findById(boardId)
        .orElseThrow(
            () -> new CustomException(
                ErrorCode.BOARD_NOT_FOUND
            )
        );
  }
}