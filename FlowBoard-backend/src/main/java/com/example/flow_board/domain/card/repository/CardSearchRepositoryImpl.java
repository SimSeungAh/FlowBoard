package com.example.flow_board.domain.card.repository;

import com.example.flow_board.domain.card.dto.request.CardDueDateFilter;
import com.example.flow_board.domain.card.dto.request.CardSearchCondition;
import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.entity.QCard;
import com.example.flow_board.domain.card.entity.QCardAssignee;
import com.example.flow_board.domain.card.entity.QCardTag;
import com.querydsl.core.BooleanBuilder;
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

  /**
   * 보드 내 카드 검색 및 필터
   */
  @Override
  public List<Card> searchCards(
      Long boardId,
      CardSearchCondition condition,
      LocalDateTime referenceTime
  ) {
    QCard card = QCard.card;

    BooleanBuilder builder =
        new BooleanBuilder();

    /*
     * 지정한 보드에 속한 카드만 조회
     */
    builder.and(
        card.boardColumn.board.id.eq(boardId)
    );

    if (condition != null) {
      builder.and(
          keywordContains(
              card,
              condition.normalizedKeyword()
          )
      );

      builder.and(
          assigneeEquals(
              card,
              condition.assigneeId()
          )
      );

      builder.and(
          tagEquals(
              card,
              condition.tagId()
          )
      );

      builder.and(
          dueDateMatches(
              card,
              condition.dueDateFilter(),
              referenceTime
          )
      );
    }

    return queryFactory
        .selectFrom(card)
        .where(builder)
        .orderBy(
            card.boardColumn.position.asc(),
            card.rank.asc()
        )
        .fetch();
  }

  /**
   * 카드 제목 또는 설명에 검색어가 포함되어 있는지 확인
   */
  private BooleanExpression keywordContains(
      QCard card,
      String keyword
  ) {
    if (keyword == null) {
      return null;
    }

    return card.title
        .containsIgnoreCase(keyword)
        .or(
            card.description
                .containsIgnoreCase(keyword)
        );
  }

  /**
   * 특정 사용자가 담당자로 등록된 카드인지 확인
   */
  private BooleanExpression assigneeEquals(
      QCard card,
      Long assigneeId
  ) {
    if (assigneeId == null) {
      return null;
    }

    QCardAssignee cardAssignee =
        QCardAssignee.cardAssignee;

    return JPAExpressions
        .selectOne()
        .from(cardAssignee)
        .where(
            cardAssignee.card.eq(card),
            cardAssignee.user.id.eq(assigneeId)
        )
        .exists();
  }

  /**
   * 특정 태그가 연결된 카드인지 확인
   */
  private BooleanExpression tagEquals(
      QCard card,
      Long tagId
  ) {
    if (tagId == null) {
      return null;
    }

    QCardTag cardTag =
        QCardTag.cardTag;

    return JPAExpressions
        .selectOne()
        .from(cardTag)
        .where(
            cardTag.card.eq(card),
            cardTag.tag.id.eq(tagId)
        )
        .exists();
  }

  /**
   * 선택한 마감일 조건에 맞는지 확인
   */
  private BooleanExpression dueDateMatches(
      QCard card,
      CardDueDateFilter dueDateFilter,
      LocalDateTime referenceTime
  ) {
    if (dueDateFilter == null) {
      return null;
    }

    LocalDateTime todayStart =
        referenceTime
            .toLocalDate()
            .atStartOfDay();

    LocalDateTime tomorrowStart =
        todayStart.plusDays(1);

    return switch (dueDateFilter) {
      case OVERDUE ->
          card.dueDate
              .isNotNull()
              .and(
                  card.dueDate.lt(referenceTime)
              );

      case TODAY ->
          card.dueDate
              .goe(todayStart)
              .and(
                  card.dueDate.lt(tomorrowStart)
              );

      case UPCOMING ->
          card.dueDate
              .isNotNull()
              .and(
                  card.dueDate.goe(referenceTime)
              );

      case NO_DUE_DATE ->
          card.dueDate.isNull();
    };
  }
}