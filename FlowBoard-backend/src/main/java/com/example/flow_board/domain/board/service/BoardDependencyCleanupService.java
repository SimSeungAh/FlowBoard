package com.example.flow_board.domain.board.service;

import com.example.flow_board.domain.activity.repository.ActivityLogRepository;
import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.entity.BoardColumn;
import com.example.flow_board.domain.board.repository.BoardColumnRepository;
import com.example.flow_board.domain.board.repository.BoardMemberRepository;
import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.entity.Tag;
import com.example.flow_board.domain.card.repository.CardRepository;
import com.example.flow_board.domain.card.repository.TagRepository;
import com.example.flow_board.domain.card.service.CardDependencyCleanupService;
import com.example.flow_board.domain.whiteboard.repository.WhiteboardStrokeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 보드를 삭제하기 전에 보드가 소유한 모든 하위 데이터를 정리
 * 이 서비스에서는 Board 자체를 삭제하지 않음
 * 실제 보드 삭제는 BoardService에서 처리
 */
@Service
@RequiredArgsConstructor
public class BoardDependencyCleanupService {

  private final BoardColumnRepository boardColumnRepository;
  private final BoardMemberRepository boardMemberRepository;
  private final CardRepository cardRepository;
  private final TagRepository tagRepository;
  private final WhiteboardStrokeRepository whiteboardStrokeRepository;
  private final ActivityLogRepository activityLogRepository;
  private final CardDependencyCleanupService cardDependencyCleanupService;

  /**
   * 특정 보드에 속한 모든 하위 데이터를 삭제
   */
  @Transactional
  public void deleteDependencies(
      Board board
  ) {
    /*
     * 보드의 모든 컬럼을 순서대로 조회
     */
    List<BoardColumn> boardColumns =
        boardColumnRepository
            .findByBoardOrderByPositionAsc(board);

    /*
     * 컬럼마다 속한 카드를 조회하고, 카드 하위 데이터부터 안전하게 삭제
     */
    for (BoardColumn boardColumn : boardColumns) {
      List<Card> cards =
          cardRepository
              .findByBoardColumnOrderByRankAsc(
                  boardColumn
              );

      for (Card card : cards) {
        cardDependencyCleanupService
            .deleteDependencies(card);
      }

      /*
       * 담당자, 태그 연결, 댓글, 체크리스트 데이터가 정리된 뒤 카드 자체를 삭제
       */
      cardRepository.deleteAll(cards);
    }

    /*
     * 카드 삭제를 먼저 DB에 반영해 컬럼 삭제 시 외래키 충돌을 방지
     */
    cardRepository.flush();

    /*
     * 화이트보드 선 삭제
     */
    whiteboardStrokeRepository.deleteByBoard(
        board
    );

    /*
     * 카드와 태그의 연결은 앞에서 모두 삭제됐으므로 이제 보드 태그 자체를 삭제할 수 있음
     */
    List<Tag> tags =
        tagRepository
            .findByBoardOrderByCreatedAtAsc(board);

    tagRepository.deleteAll(tags);

    /*
     * 해당 보드의 활동 로그 삭제
     */
    activityLogRepository.deleteByBoard(
        board
    );

    /*
     * 보드 멤버 연결 삭제
     */
    boardMemberRepository.deleteAll(
        boardMemberRepository.findByBoard(board)
    );

    /*
     * 카드가 모두 삭제된 뒤 보드 컬럼을 삭제
     */
    boardColumnRepository.deleteAll(
        boardColumns
    );

    /*
     * Board 자체를 삭제하기 전에 지금까지의 삭제 작업을 DB에 반영
     */
    boardColumnRepository.flush();
  }
}