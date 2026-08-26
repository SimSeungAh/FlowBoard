package com.example.flow_board.domain.requirement.repository;

import com.example.flow_board.domain.requirement.entity.RequirementMetadata;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RequirementMetadataRepository extends JpaRepository<RequirementMetadata, Long> {
  Optional<RequirementMetadata> findByCard_Id(Long cardId);
}
