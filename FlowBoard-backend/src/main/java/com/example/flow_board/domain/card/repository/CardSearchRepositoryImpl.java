package com.example.flow_board.domain.card.repository;

import com.example.flow_board.domain.card.dto.request.CardDueDateFilter;
import com.example.flow_board.domain.card.dto.request.CardSearchCondition;
import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.entity.QCard;
import com.example.flow_board.domain.card.entity.QCardAssignee;
import com.example.flow_board.domain.card.entity.QCardTag;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.JPAExpressions;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class CardSearchRepositoryImpl
    implements CardSearchRepository {

  private final JPAQueryFactory queryFactory;

  @Override
  public List<Card> searchCards(
      Long boardId,
      CardSearchCondition condition,
      LocalDateTime referenceTime
  ) {
    QCard card =
        QCard.card;

    QCardAssignee assignee =
        new QCardAssignee(
            "searchAssignee"
        );

    QCardTag cardTag =
        new QCardTag(
            "searchCardTag"
        );

    return queryFactory
        .selectFrom(card)

        /*
         * 검색 결과 응답에서 바로 사용하는
         * 컬럼/작성자 정보를 함께 조회합니다.
         *
         * 검색 결과를 DTO로 변환할 때
         * 불필요한 추가 쿼리가 발생하는 것을 줄입니다.
         */
        .join(
            card.boardColumn
        )
        .fetchJoin()

        .join(
            card.createdBy
        )
        .fetchJoin()

        .where(
            card.boardColumn
                .board
                .id
                .eq(boardId),

            keywordContains(
                card,
                condition.normalizedKeyword()
            ),

            assigneeExists(
                card,
                assignee,
                condition.assigneeId()
            ),

            tagExists(
                card,
                cardTag,
                condition.tagId()
            ),

            dueDateMatches(
                card,
                condition.dueDateFilter(),
                referenceTime
            )
        )

        /*
         * 먼저 컬럼 순서대로,
         * 같은 컬럼에서는 LexoRank 순서대로 정렬합니다.
         */
        .orderBy(
            card.boardColumn
                .position
                .asc(),

            card.rank.asc()
        )
        .fetch();
  }

  /**
   * 카드 제목 또는 설명 검색
   */
  private BooleanExpression keywordContains(
      QCard card,
      String keyword
  ) {
    if (keyword == null) {
      return null;
    }

    return card.title
        .containsIgnoreCase(
            keyword
        )
        .or(
            card.description
                .containsIgnoreCase(
                    keyword
                )
        );
  }

  /**
   * 특정 담당자가 지정된 카드인지 검사
   */
  private BooleanExpression assigneeExists(
      QCard card,
      QCardAssignee assignee,
      Long assigneeId
  ) {
    if (assigneeId == null) {
      return null;
    }

    return JPAExpressions
        .selectOne()
        .from(assignee)
        .where(
            assignee.card.eq(
                card
            ),
            assignee.user
                .id
                .eq(assigneeId)
        )
        .exists();
  }

  /**
   * 특정 태그가 연결된 카드인지 검사
   */
  private BooleanExpression tagExists(
      QCard card,
      QCardTag cardTag,
      Long tagId
  ) {
    if (tagId == null) {
      return null;
    }

    return JPAExpressions
        .selectOne()
        .from(cardTag)
        .where(
            cardTag.card.eq(
                card
            ),
            cardTag.tag
                .id
                .eq(tagId)
        )
        .exists();
  }

  /**
   * 마감일 필터
   */
  private BooleanExpression dueDateMatches(
      QCard card,
      CardDueDateFilter dueDateFilter,
      LocalDateTime referenceTime
  ) {
    if (dueDateFilter == null) {
      return null;
    }

    return switch (dueDateFilter) {

      /*
       * 현재 시각보다 이전이면 마감됨
       */
      case OVERDUE ->
          card.dueDate
              .isNotNull()
              .and(
                  card.dueDate.lt(
                      referenceTime
                  )
              );

      /*
       * 오늘 00:00 이상
       * 내일 00:00 미만
       */
      case TODAY -> {
        LocalDateTime todayStart =
            referenceTime
                .toLocalDate()
                .atStartOfDay();

        LocalDateTime tomorrowStart =
            todayStart.plusDays(1);

        yield card.dueDate
            .isNotNull()
            .and(
                card.dueDate.goe(
                    todayStart
                )
            )
            .and(
                card.dueDate.lt(
                    tomorrowStart
                )
            );
      }

      /*
       * 현재 시각 이후의 마감일
       */
      case UPCOMING ->
          card.dueDate
              .isNotNull()
              .and(
                  card.dueDate.goe(
                      referenceTime
                  )
              );

      /*
       * 마감일 미설정 카드
       */
      case NO_DUE_DATE ->
          card.dueDate.isNull();
    };
  }
}