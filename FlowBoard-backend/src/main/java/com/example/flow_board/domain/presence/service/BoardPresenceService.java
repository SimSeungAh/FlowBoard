package com.example.flow_board.domain.presence.service;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.repository.BoardRepository;
import com.example.flow_board.domain.board.service.BoardPermissionService;
import com.example.flow_board.domain.presence.dto.BoardPresenceHeartbeatRequest;
import com.example.flow_board.domain.presence.dto.BoardPresenceResponse;
import com.example.flow_board.domain.presence.entity.BoardPresenceSection;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.domain.whiteboard.entity.Whiteboard;
import com.example.flow_board.domain.whiteboard.repository.WhiteboardRepository;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BoardPresenceService {

  /** heartbeat는 25초 간격, 60초 이내 갱신된 사용자를 온라인으로 판단합니다. */
  private static final long ONLINE_WINDOW_MILLIS = 60_000L;
  private static final Duration DETAIL_TTL = Duration.ofSeconds(90);
  private static final Duration INDEX_TTL = Duration.ofHours(2);

  private final StringRedisTemplate redisTemplate;
  private final BoardRepository boardRepository;
  private final BoardPermissionService boardPermissionService;
  private final WhiteboardRepository whiteboardRepository;

  public void heartbeat(
      User user,
      Long boardId,
      BoardPresenceHeartbeatRequest request
  ) {
    Board board = getBoard(boardId);
    boardPermissionService.validateReadPermission(board, user);

    String whiteboardTitle = null;
    Long whiteboardId = null;

    if (request.section() == BoardPresenceSection.WHITEBOARD && request.whiteboardId() != null) {
      Whiteboard whiteboard = whiteboardRepository
          .findByIdAndBoard(request.whiteboardId(), board)
          .orElseThrow(() -> new CustomException(ErrorCode.WHITEBOARD_NOT_FOUND));

      whiteboardId = whiteboard.getId();
      whiteboardTitle = whiteboard.getTitle();
    }

    long now = System.currentTimeMillis();
    String member = user.getId().toString();
    String indexKey = indexKey(boardId);
    String detailKey = detailKey(boardId, user.getId());

    redisTemplate.opsForZSet().add(indexKey, member, now);
    redisTemplate.expire(indexKey, INDEX_TTL);

    Map<String, String> detail = new HashMap<>();
    detail.put("nickname", user.getNickname());
    detail.put("section", request.section().name());
    detail.put("lastSeenAt", Long.toString(now));
    detail.put("whiteboardId", whiteboardId == null ? "" : whiteboardId.toString());
    detail.put("whiteboardTitle", whiteboardTitle == null ? "" : whiteboardTitle);

    redisTemplate.opsForHash().putAll(detailKey, detail);
    redisTemplate.expire(detailKey, DETAIL_TTL);
  }

  public List<BoardPresenceResponse> getOnlineMembers(
      User user,
      Long boardId
  ) {
    Board board = getBoard(boardId);
    boardPermissionService.validateReadPermission(board, user);

    long now = System.currentTimeMillis();
    long cutoff = now - ONLINE_WINDOW_MILLIS;
    String indexKey = indexKey(boardId);

    redisTemplate.opsForZSet().removeRangeByScore(indexKey, 0, cutoff - 1);

    Set<String> members = redisTemplate.opsForZSet()
        .reverseRangeByScore(indexKey, cutoff, now + 5_000);

    if (members == null || members.isEmpty()) {
      return List.of();
    }

    List<BoardPresenceResponse> result = new ArrayList<>();

    for (String member : members) {
      Long userId;
      try {
        userId = Long.valueOf(member);
      } catch (NumberFormatException ignored) {
        continue;
      }

      Map<Object, Object> detail = redisTemplate.opsForHash().entries(detailKey(boardId, userId));
      if (detail.isEmpty()) {
        continue;
      }

      String nickname = stringValue(detail.get("nickname"));
      String sectionValue = stringValue(detail.get("section"));
      String lastSeenValue = stringValue(detail.get("lastSeenAt"));
      String whiteboardIdValue = stringValue(detail.get("whiteboardId"));
      String whiteboardTitle = emptyToNull(stringValue(detail.get("whiteboardTitle")));

      try {
        BoardPresenceSection section = BoardPresenceSection.valueOf(sectionValue);
        Long presenceWhiteboardId = whiteboardIdValue.isBlank()
            ? null
            : Long.valueOf(whiteboardIdValue);
        Long lastSeenAt = Long.valueOf(lastSeenValue);

        if (lastSeenAt < cutoff) {
          continue;
        }

        result.add(new BoardPresenceResponse(
            userId,
            nickname,
            section,
            presenceWhiteboardId,
            whiteboardTitle,
            lastSeenAt
        ));
      } catch (IllegalArgumentException ignored) {
        // 손상된 임시 Presence 데이터는 영구 데이터가 아니므로 건너뜁니다.
      }
    }

    return result;
  }

  private Board getBoard(Long boardId) {
    return boardRepository
        .findById(boardId)
        .orElseThrow(() -> new CustomException(ErrorCode.BOARD_NOT_FOUND));
  }

  private String indexKey(Long boardId) {
    return "flowboard:board:" + boardId + ":presence";
  }

  private String detailKey(Long boardId, Long userId) {
    return "flowboard:board:" + boardId + ":presence:user:" + userId;
  }

  private String stringValue(Object value) {
    return value == null ? "" : value.toString();
  }

  private String emptyToNull(String value) {
    return value == null || value.isBlank() ? null : value;
  }
}
