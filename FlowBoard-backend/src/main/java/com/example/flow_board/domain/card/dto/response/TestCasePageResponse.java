package com.example.flow_board.domain.card.dto.response;

import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.entity.TestCaseResult;
import com.example.flow_board.domain.card.entity.TestCaseType;
import org.springframework.data.domain.Page;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record TestCasePageResponse(

    List<Item> content,

    int page,

    int size,

    long totalElements,

    int totalPages,

    boolean first,

    boolean last

) {

  public static TestCasePageResponse from(
      Page<Card> cardPage,
      Map<Long, List<CardAssigneeResponse>> assigneesByCardId,
      Map<Long, List<TagResponse>> tagsByCardId
  ) {
    List<Item> content =
        cardPage
            .getContent()
            .stream()
            .map(card ->
                Item.from(
                    card,
                    assigneesByCardId.getOrDefault(
                        card.getId(),
                        List.of()
                    ),
                    tagsByCardId.getOrDefault(
                        card.getId(),
                        List.of()
                    )
                )
            )
            .toList();

    return new TestCasePageResponse(
        content,
        cardPage.getNumber(),
        cardPage.getSize(),
        cardPage.getTotalElements(),
        cardPage.getTotalPages(),
        cardPage.isFirst(),
        cardPage.isLast()
    );
  }

  public record Item(

      Long id,

      Long columnId,

      String columnTitle,

      Long createdById,

      String createdByNickname,

      String title,

      String description,

      LocalDateTime dueDate,

      TestCaseType testCaseType,

      TestCaseResult testCaseResult,

      List<CardAssigneeResponse> assignees,

      List<TagResponse> tags,

      LocalDateTime createdAt,

      LocalDateTime updatedAt

  ) {

    private static Item from(
        Card card,
        List<CardAssigneeResponse> assignees,
        List<TagResponse> tags
    ) {
      return new Item(
          card.getId(),
          card.getBoardColumn().getId(),
          card.getBoardColumn().getTitle(),
          card.getCreatedBy().getId(),
          card.getCreatedBy().getNickname(),
          card.getTitle(),
          card.getDescription(),
          card.getDueDate(),
          card.getTestCaseType(),
          card.getTestCaseResult(),
          List.copyOf(assignees),
          List.copyOf(tags),
          card.getCreatedAt(),
          card.getUpdatedAt()
      );
    }
  }
}