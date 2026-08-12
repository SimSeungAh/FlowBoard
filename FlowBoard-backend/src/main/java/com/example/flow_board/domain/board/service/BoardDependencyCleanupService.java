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
   * 보드를 삭제하기 전에 보드에 연결된 모든 데이터를
   * FK 의존 관계에 맞춰 제거합니다.
   *
   * Board 자체 삭제는 BoardService에서 처리합니다.
   */
  @Transactional
  public void deleteDependencies(
      Board board
  ) {

    /*
     * 1.
     * 보드 컬럼 조회
     */
    List<BoardColumn> columns =
        boardColumnRepository
            .findByBoardOrderByPositionAsc(
                board
            );

    /*
     * 2.
     * 각 컬럼의 카드를 조회하고
     * 카드에 연결된 자식 데이터부터 삭제합니다.
     */
    for (BoardColumn column : columns) {

      List<Card> cards =
          cardRepository
              .findByBoardColumnOrderByRankAsc(
                  column
              );

      for (Card card : cards) {
        cardDependencyCleanupService
            .deleteDependencies(
                card
            );
      }

      /*
       * 모든 카드 자식 데이터가 제거된 후
       * 카드를 삭제합니다.
       */
      cardRepository.deleteAll(
          cards
      );

      /*
       * 컬럼 삭제 전에 카드 삭제를
       * 실제 DB에 반영합니다.
       */
      cardRepository.flush();
    }

    /*
     * 3.
     * 화이트보드 선 삭제
     */
    whiteboardStrokeRepository
        .deleteByBoard(
            board
        );

    /*
     * 4.
     * 보드 태그 삭제
     *
     * CardTag는 위의 카드 정리 과정에서
     * 이미 제거된 상태입니다.
     */
    List<Tag> tags =
        tagRepository
            .findByBoardOrderByCreatedAtAsc(
                board
            );

    tagRepository.deleteAll(
        tags
    );

    /*
     * 5.
     * 활동 로그 삭제
     */
    activityLogRepository
        .deleteByBoard(
            board
        );

    /*
     * 6.
     * 보드 멤버 삭제
     */
    boardMemberRepository.deleteAll(
        boardMemberRepository
            .findByBoard(
                board
            )
    );

    /*
     * 7.
     * 마지막으로 보드 컬럼 삭제
     */
    boardColumnRepository.deleteAll(
        columns
    );

    /*
     * BoardService에서 board를 삭제하기 전에
     * 위의 모든 삭제 작업을 DB에 반영합니다.
     *
     * 하나의 EntityManager를 사용하므로
     * 여기서 flush 하면 앞의 Repository 삭제도
     * 함께 반영됩니다.
     */
    boardColumnRepository.flush();
  }
}