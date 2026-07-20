package com.example.flow_board.domain.whiteboard.service;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.entity.BoardMember;
import com.example.flow_board.domain.board.entity.BoardRole;
import com.example.flow_board.domain.board.repository.BoardMemberRepository;
import com.example.flow_board.domain.board.repository.BoardRepository;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.domain.whiteboard.dto.WhiteboardPoint;
import com.example.flow_board.domain.whiteboard.dto.request.WhiteboardStrokeCreateRequest;
import com.example.flow_board.domain.whiteboard.dto.response.WhiteboardStrokeResponse;
import com.example.flow_board.domain.whiteboard.entity.WhiteboardStroke;
import com.example.flow_board.domain.whiteboard.repository.WhiteboardStrokeRepository;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WhiteboardService {

  private static final TypeReference<List<WhiteboardPoint>>
      WHITEBOARD_POINT_LIST_TYPE = new TypeReference<>() {
  };

  private final BoardRepository boardRepository;
  private final BoardMemberRepository boardMemberRepository;
  private final WhiteboardStrokeRepository whiteboardStrokeRepository;
  private final ObjectMapper objectMapper;

  /**
   * 화이트보드 선 저장
   */
  @Transactional
  public WhiteboardStrokeResponse createStroke(
      User user,
      Long boardId,
      WhiteboardStrokeCreateRequest request
  ) {
    Board board = getBoardById(boardId);
    BoardMember boardMember = getBoardMember(board, user);

    validateWhiteboardWritePermission(boardMember);

    boolean alreadyExists =
        whiteboardStrokeRepository
            .existsByBoardAndClientStrokeId(
                board,
                request.clientStrokeId()
            );

    if (alreadyExists) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT
      );
    }

    String pointsJson = convertPointsToJson(
        request.points()
    );

    WhiteboardStroke whiteboardStroke =
        new WhiteboardStroke(
            board,
            user,
            request.clientStrokeId(),
            request.tool(),
            request.color(),
            request.lineWidth(),
            pointsJson
        );

    WhiteboardStroke savedStroke =
        whiteboardStrokeRepository.save(
            whiteboardStroke
        );

    return WhiteboardStrokeResponse.from(
        savedStroke,
        request.points()
    );
  }

  /**
   * 특정 보드의 화이트보드 선 전체 조회
   */
  public List<WhiteboardStrokeResponse> getStrokes(
      User user,
      Long boardId
  ) {
    Board board = getBoardById(boardId);

    validateWhiteboardReadPermission(
        board,
        user
    );

    return whiteboardStrokeRepository
        .findByBoardOrderByIdAsc(board)
        .stream()
        .map(stroke ->
            WhiteboardStrokeResponse.from(
                stroke,
                convertJsonToPoints(
                    stroke.getPointsJson()
                )
            )
        )
        .toList();
  }

  /**
   * 특정 보드의 화이트보드 전체 삭제
   */
  @Transactional
  public void clearWhiteboard(
      User user,
      Long boardId
  ) {
    Board board = getBoardById(boardId);
    BoardMember boardMember = getBoardMember(
        board,
        user
    );

    validateWhiteboardWritePermission(
        boardMember
    );

    whiteboardStrokeRepository.deleteByBoard(
        board
    );
  }

  /**
   * 보드 조회
   */
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

  /**
   * 현재 사용자의 보드 멤버 정보 조회
   */
  private BoardMember getBoardMember(
      Board board,
      User user
  ) {
    return boardMemberRepository
        .findByBoardAndUser(board, user)
        .orElseThrow(
            () -> new CustomException(
                ErrorCode.BOARD_ACCESS_DENIED
            )
        );
  }

  /**
   * 화이트보드 조회 권한 검사
   * OWNER, MEMBER, VIEWER 모두 조회할 수 있음
   */
  private void validateWhiteboardReadPermission(
      Board board,
      User user
  ) {
    getBoardMember(board, user);
  }

  /**
   * 화이트보드 수정 권한 검사
   * OWNER와 MEMBER만 선을 그리거나 화이트보드를 전체 삭제할 수 있음
   */
  private void validateWhiteboardWritePermission(
      BoardMember boardMember
  ) {
    if (boardMember.getRole() == BoardRole.VIEWER) {
      throw new CustomException(
          ErrorCode.BOARD_ACCESS_DENIED
      );
    }
  }

  /**
   * 좌표 목록을 JSON 문자열로 변환
   */
  private String convertPointsToJson(
      List<WhiteboardPoint> points
  ) {
    try {
      return objectMapper.writeValueAsString(
          points
      );
    } catch (JsonProcessingException exception) {
      throw new CustomException(
          ErrorCode.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * JSON 문자열을 좌표 목록으로 변환
   */
  private List<WhiteboardPoint> convertJsonToPoints(
      String pointsJson
  ) {
    try {
      return objectMapper.readValue(
          pointsJson,
          WHITEBOARD_POINT_LIST_TYPE
      );
    } catch (JsonProcessingException exception) {
      throw new CustomException(
          ErrorCode.INTERNAL_SERVER_ERROR
      );
    }
  }
}