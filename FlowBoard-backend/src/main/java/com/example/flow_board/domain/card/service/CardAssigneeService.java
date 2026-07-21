package com.example.flow_board.domain.card.service;

import com.example.flow_board.domain.activity.entity.ActivityType;
import com.example.flow_board.domain.activity.service.ActivityLogService;
import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.repository.BoardMemberRepository;
import com.example.flow_board.domain.board.service.BoardPermissionService;
import com.example.flow_board.domain.card.dto.request.CardAssigneeAddRequest;
import com.example.flow_board.domain.card.dto.response.CardAssigneeResponse;
import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.entity.CardAssignee;
import com.example.flow_board.domain.card.repository.CardAssigneeRepository;
import com.example.flow_board.domain.card.repository.CardRepository;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.domain.user.repository.UserRepository;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CardAssigneeService {

  private final CardRepository cardRepository;
  private final CardAssigneeRepository cardAssigneeRepository;
  private final UserRepository userRepository;

  /*
   * 담당자로 지정할 사용자가 실제 보드 멤버인지
   * 확인할 때 사용합니다.
   */
  private final BoardMemberRepository boardMemberRepository;

  /*
   * 로그인 사용자의 읽기·쓰기 권한을 검사합니다.
   */
  private final BoardPermissionService boardPermissionService;

  private final ActivityLogService activityLogService;

  /**
   * 카드 담당자 추가
   *
   * OWNER와 MEMBER만 가능합니다.
   */
  @Transactional
  public CardAssigneeResponse addAssignee(
      User loginUser,
      Long cardId,
      CardAssigneeAddRequest request
  ) {
    Card card =
        getCardById(cardId);

    Board board =
        card.getBoardColumn()
            .getBoard();

    /*
     * VIEWER는 담당자를 추가할 수 없습니다.
     */
    boardPermissionService.validateWritePermission(
        board,
        loginUser
    );

    User assignee =
        getUserById(
            request.userId()
        );

    /*
     * 담당자로 지정할 사용자도
     * 해당 보드에 참여 중이어야 합니다.
     */
    validateAssigneeIsBoardMember(
        board,
        assignee
    );

    boolean alreadyExists =
        cardAssigneeRepository
            .existsByCardAndUser(
                card,
                assignee
            );

    if (alreadyExists) {
      throw new CustomException(
          ErrorCode.CARD_ASSIGNEE_ALREADY_EXISTS
      );
    }

    CardAssignee cardAssignee =
        new CardAssignee(
            card,
            assignee
        );

    CardAssignee savedCardAssignee =
        cardAssigneeRepository.save(
            cardAssignee
        );

    CardAssigneeResponse response =
        CardAssigneeResponse.from(
            savedCardAssignee
        );

    activityLogService.recordActivity(
        board,
        loginUser,
        ActivityType.CARD_ASSIGNEE_ADDED,
        card.getId(),
        card.getTitle(),
        loginUser.getNickname()
            + "님이 '"
            + card.getTitle()
            + "' 카드에 "
            + assignee.getNickname()
            + "님을 담당자로 추가했습니다."
    );

    return response;
  }

  /**
   * 카드 담당자 목록 조회
   *
   * OWNER, MEMBER, VIEWER 모두 가능합니다.
   */
  public List<CardAssigneeResponse> getAssignees(
      User loginUser,
      Long cardId
  ) {
    Card card =
        getCardById(cardId);

    Board board =
        card.getBoardColumn()
            .getBoard();

    boardPermissionService.validateReadPermission(
        board,
        loginUser
    );

    return cardAssigneeRepository
        .findByCardOrderByCreatedAtAsc(card)
        .stream()
        .map(CardAssigneeResponse::from)
        .toList();
  }

  /**
   * 카드 담당자 삭제
   *
   * OWNER와 MEMBER만 가능합니다.
   */
  @Transactional
  public void removeAssignee(
      User loginUser,
      Long cardId,
      Long userId
  ) {
    Card card =
        getCardById(cardId);

    Board board =
        card.getBoardColumn()
            .getBoard();

    /*
     * VIEWER는 담당자를 삭제할 수 없습니다.
     */
    boardPermissionService.validateWritePermission(
        board,
        loginUser
    );

    User assignee =
        getUserById(userId);

    CardAssignee cardAssignee =
        cardAssigneeRepository
            .findByCardAndUser(
                card,
                assignee
            )
            .orElseThrow(
                () -> new CustomException(
                    ErrorCode.CARD_ASSIGNEE_NOT_FOUND
                )
            );

    String cardTitle =
        card.getTitle();

    String assigneeNickname =
        assignee.getNickname();

    cardAssigneeRepository.delete(
        cardAssignee
    );

    activityLogService.recordActivity(
        board,
        loginUser,
        ActivityType.CARD_ASSIGNEE_REMOVED,
        card.getId(),
        cardTitle,
        loginUser.getNickname()
            + "님이 '"
            + cardTitle
            + "' 카드에서 "
            + assigneeNickname
            + "님을 담당자에서 제외했습니다."
    );
  }

  /**
   * 카드 조회
   */
  private Card getCardById(
      Long cardId
  ) {
    return cardRepository
        .findById(cardId)
        .orElseThrow(
            () -> new CustomException(
                ErrorCode.CARD_NOT_FOUND
            )
        );
  }

  /**
   * 사용자 조회
   */
  private User getUserById(
      Long userId
  ) {
    return userRepository
        .findById(userId)
        .orElseThrow(
            () -> new CustomException(
                ErrorCode.USER_NOT_FOUND
            )
        );
  }

  /**
   * 담당자로 지정할 사용자가
   * 해당 보드의 멤버인지 확인합니다.
   */
  private void validateAssigneeIsBoardMember(
      Board board,
      User assignee
  ) {
    boolean isBoardMember =
        boardMemberRepository
            .existsByBoardAndUser(
                board,
                assignee
            );

    if (!isBoardMember) {
      throw new CustomException(
          ErrorCode.ASSIGNEE_NOT_BOARD_MEMBER
      );
    }
  }
}