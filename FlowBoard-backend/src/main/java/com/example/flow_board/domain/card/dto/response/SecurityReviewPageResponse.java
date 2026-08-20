package com.example.flow_board.domain.card.dto.response;

import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.entity.SecuritySeverity;
import com.example.flow_board.domain.card.entity.SecurityVerificationStatus;
import org.springframework.data.domain.Page;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record SecurityReviewPageResponse(

    List<Item> content,

    int page,

    int size,

    long totalElements,

    int totalPages,

    boolean first,

    boolean last

) {

  public static SecurityReviewPageResponse from(
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

    return new SecurityReviewPageResponse(
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

      SecuritySeverity securitySeverity,

      String securityImpactScope,

      SecurityVerificationStatus securityVerificationStatus,

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
          card.getSecuritySeverity(),
          card.getSecurityImpactScope(),
          card.getSecurityVerificationStatus(),
          List.copyOf(assignees),
          List.copyOf(tags),
          card.getCreatedAt(),
          card.getUpdatedAt()
      );
    }
  }
}