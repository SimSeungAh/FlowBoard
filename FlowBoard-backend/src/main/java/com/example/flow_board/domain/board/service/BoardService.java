package com.example.flow_board.domain.board.service;

import com.example.flow_board.domain.activity.entity.ActivityType;
import com.example.flow_board.domain.activity.service.ActivityLogService;
import com.example.flow_board.domain.board.dto.request.BoardCreateRequest;
import com.example.flow_board.domain.board.dto.request.BoardUpdateRequest;
import com.example.flow_board.domain.board.dto.response.BoardColumnResponse;
import com.example.flow_board.domain.board.dto.response.BoardDetailResponse;
import com.example.flow_board.domain.board.dto.response.BoardResponse;
import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.entity.BoardColumn;
import com.example.flow_board.domain.board.entity.BoardMember;
import com.example.flow_board.domain.board.entity.BoardRole;
import com.example.flow_board.domain.board.repository.BoardColumnRepository;
import com.example.flow_board.domain.board.repository.BoardMemberRepository;
import com.example.flow_board.domain.board.repository.BoardRepository;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BoardService {

  private final BoardRepository boardRepository;
  private final BoardMemberRepository boardMemberRepository;
  private final BoardColumnRepository boardColumnRepository;
  private final ActivityLogService activityLogService;
  private final BoardDependencyCleanupService boardDependencyCleanupService;

  /**
   * 보드 생성
   */
  @Transactional
  public BoardResponse createBoard(
      User user,
      BoardCreateRequest request
  ) {
    Board board = new Board(
        user,
        request.title(),
        request.description()
    );

    Board savedBoard =
        boardRepository.save(board);

    BoardMember ownerMember =
        new BoardMember(
            savedBoard,
            user,
            BoardRole.OWNER
        );

    boardMemberRepository.save(
        ownerMember
    );

    createDefaultColumns(
        savedBoard
    );

    activityLogService.recordActivity(
        savedBoard,
        user,
        ActivityType.BOARD_CREATED,
        savedBoard.getId(),
        savedBoard.getTitle(),
        user.getNickname()
            + "님이 '"
            + savedBoard.getTitle()
            + "' 보드를 생성했습니다."
    );

    return BoardResponse.from(
        savedBoard
    );
  }

  /**
   * 내가 소유한 보드 목록 조회
   */
  public List<BoardResponse> getMyBoards(
      User user
  ) {
    return boardRepository
        .findByOwnerOrderByCreatedAtDesc(user)
        .stream()
        .map(BoardResponse::from)
        .toList();
  }

  /**
   * 보드 상세 조회
   */
  public BoardDetailResponse getBoardDetail(
      User user,
      Long boardId
  ) {
    Board board =
        getBoardById(boardId);

    validateBoardOwner(
        board,
        user
    );

    List<BoardColumnResponse> columns =
        boardColumnRepository
            .findByBoardOrderByPositionAsc(board)
            .stream()
            .map(BoardColumnResponse::from)
            .toList();

    return BoardDetailResponse.from(
        board,
        columns
    );
  }

  /**
   * 보드 수정
   */
  @Transactional
  public BoardResponse updateBoard(
      User user,
      Long boardId,
      BoardUpdateRequest request
  ) {
    Board board =
        getBoardById(boardId);

    validateBoardOwner(
        board,
        user
    );

    String oldTitle =
        board.getTitle();

    String backgroundColor =
        request.backgroundColor();

    if (
        backgroundColor == null ||
            backgroundColor.isBlank()
    ) {
      backgroundColor =
          board.getBackgroundColor();
    }

    board.update(
        request.title(),
        request.description(),
        backgroundColor
    );

    String description;

    if (
        Objects.equals(
            oldTitle,
            board.getTitle()
        )
    ) {
      description =
          user.getNickname()
              + "님이 '"
              + board.getTitle()
              + "' 보드 정보를 수정했습니다.";
    } else {
      description =
          user.getNickname()
              + "님이 보드 이름을 '"
              + oldTitle
              + "'에서 '"
              + board.getTitle()
              + "'(으)로 변경했습니다.";
    }

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.BOARD_UPDATED,
        board.getId(),
        board.getTitle(),
        description
    );

    return BoardResponse.from(
        board
    );
  }

  /**
   * 보드 삭제
   */
  @Transactional
  public void deleteBoard(
      User user,
      Long boardId
  ) {
    Board board =
        getBoardById(boardId);

    validateBoardOwner(
        board,
        user
    );

    /*
     * 보드가 소유한 하위 데이터를 먼저 정리합니다.
     *
     * 카드 하위 데이터
     * 카드
     * 화이트보드 선
     * 태그
     * 활동 로그
     * 보드 멤버
     * 보드 컬럼
     */
    boardDependencyCleanupService
        .deleteDependencies(board);

    /*
     * 모든 하위 데이터가 정리된 뒤
     * 보드 자체를 삭제합니다.
     */
    boardRepository.delete(
        board
    );
  }

  /**
   * 보드 생성 시 기본 컬럼 생성
   */
  private void createDefaultColumns(
      Board board
  ) {
    List<BoardColumn> defaultColumns =
        List.of(
            new BoardColumn(
                board,
                "할일",
                0
            ),
            new BoardColumn(
                board,
                "진행중",
                1
            ),
            new BoardColumn(
                board,
                "완료",
                2
            )
        );

    boardColumnRepository.saveAll(
        defaultColumns
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
   * 보드 소유자인지 검사
   */
  private void validateBoardOwner(
      Board board,
      User user
  ) {
    if (
        !Objects.equals(
            board.getOwner().getId(),
            user.getId()
        )
    ) {
      throw new CustomException(
          ErrorCode.BOARD_ACCESS_DENIED
      );
    }
  }
}