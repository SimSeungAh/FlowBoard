package com.example.flow_board.domain.card.dto.response;

import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.entity.CardTaskType;
import com.example.flow_board.domain.card.entity.TestCaseResult;
import com.example.flow_board.domain.card.entity.TestCaseType;

import java.time.LocalDateTime;

public record CardResponse(

    Long id,

    Long columnId,

    Long createdById,

    String createdByNickname,

    String title,

    String description,

    String rank,

    LocalDateTime dueDate,

    /*
     * 카드의 작업 형식
     */
    CardTaskType taskType,

    /*
     * TEST_CASE에서만 사용
     */
    TestCaseType testCaseType,

    /*
     * TEST_CASE에서만 사용
     */
    TestCaseResult testCaseResult,

    LocalDateTime createdAt,

    LocalDateTime updatedAt

) {

  public static CardResponse from(
      Card card
  ) {
    return new CardResponse(
        card.getId(),
        card.getBoardColumn().getId(),
        card.getCreatedBy().getId(),
        card.getCreatedBy().getNickname(),
        card.getTitle(),
        card.getDescription(),
        card.getRank(),
        card.getDueDate(),

        card.getTaskType(),
        card.getTestCaseType(),
        card.getTestCaseResult(),

        card.getCreatedAt(),
        card.getUpdatedAt()
    );
  }
}