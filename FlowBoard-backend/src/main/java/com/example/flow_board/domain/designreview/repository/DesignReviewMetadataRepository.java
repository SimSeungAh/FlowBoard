package com.example.flow_board.domain.designreview.repository;

import com.example.flow_board.domain.designreview.entity.DesignReviewMetadata;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DesignReviewMetadataRepository extends JpaRepository<DesignReviewMetadata, Long> {
  Optional<DesignReviewMetadata> findByCard_Id(Long cardId);
}
