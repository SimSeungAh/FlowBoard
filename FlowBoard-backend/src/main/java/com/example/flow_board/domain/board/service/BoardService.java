package com.example.flow_board.domain.board.service;

import com.example.flow_board.domain.activity.entity.ActivityType;
import com.example.flow_board.domain.activity.service.ActivityLogService;
import com.example.flow_board.domain.board.dto.request.BoardCreateRequest;
import com.example.flow_board.domain.board.dto.request.BoardUpdateRequest;
import com.example.flow_board.domain.board.dto.response.BoardColumnResponse;
import com.example.flow_board.domain.board.dto.response.BoardDetailResponse;
import com.example.flow_board.domain.board.dto.response.BoardListResponse;
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
   * 내가 참여 중인 보드 목록 조회
   * OWNER, MEMBER, VIEWER 역할을 모두 포함
   */
  public List<BoardListResponse> getMyBoards(
      User user
  ) {
    return boardMemberRepository
        .findAllByUserWithBoardAndOwnerOrderByBoardUpdatedAtDesc(
            user
        )
        .stream()
        .map(BoardListResponse::from)
        .toList();
  }

  /**
   * 보드 상세 조회
   * OWNER, MEMBER, VIEWER 모두 조회할 수 있음
   * 로그인 사용자의 역할도 함께 반환
   */
  public BoardDetailResponse getBoardDetail(
      User user,
      Long boardId
  ) {
    Board board =
        getBoardById(boardId);

    BoardMember boardMember =
        getBoardMember(
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
        boardMember.getRole(),
        columns
    );
  }

  /**
   * 보드 수정
   * OWNER만 사용할 수 있음
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
        backgroundColor == null
            || backgroundColor.isBlank()
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
   * OWNER만 사용할 수 있음
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

    boardDependencyCleanupService
        .deleteDependencies(board);

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
   * 현재 사용자의 보드 멤버 정보 조회
   * 보드 멤버가 아니라면 접근을 거부
   */
  private BoardMember getBoardMember(
      Board board,
      User user
  ) {
    return boardMemberRepository
        .findByBoardAndUser(
            board,
            user
        )
        .orElseThrow(
            () -> new CustomException(
                ErrorCode.BOARD_ACCESS_DENIED
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