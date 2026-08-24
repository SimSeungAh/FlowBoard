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
import com.example.flow_board.domain.whiteboard.repository.WhiteboardRepository;
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
  private final WhiteboardRepository whiteboardRepository;

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
    for (
        BoardColumn column :
        columns
    ) {
      List<Card> cards =
          cardRepository
              .findByBoardColumnOrderByRankAsc(
                  column
              );

      for (
          Card card :
          cards
      ) {
        cardDependencyCleanupService
            .deleteDependencies(
                card
            );
      }

      cardRepository.deleteAll(
          cards
      );

      cardRepository.flush();
    }

    /*
     * 3.
     * 화이트보드 Stroke 삭제
     *
     * whiteboards보다 먼저 지워야
     * whiteboard_strokes.whiteboard_id FK가 안전합니다.
     */
    whiteboardStrokeRepository
        .deleteByBoard(
            board
        );

    /*
     * 4.
     * 화이트보드 작업 공간 삭제
     */
    whiteboardRepository
        .deleteByBoard(
            board
        );

    /*
     * 5.
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
     * 6.
     * 활동 로그 삭제
     */
    activityLogRepository
        .deleteByBoard(
            board
        );

    /*
     * 7.
     * 보드 멤버 삭제
     */
    boardMemberRepository.deleteAll(
        boardMemberRepository
            .findByBoard(
                board
            )
    );

    /*
     * 8.
     * 마지막으로 보드 컬럼 삭제
     */
    boardColumnRepository.deleteAll(
        columns
    );

    /*
     * BoardService에서 board를 삭제하기 전에
     * 위의 모든 삭제 작업을 DB에 반영합니다.
     */
    boardColumnRepository.flush();
  }
}