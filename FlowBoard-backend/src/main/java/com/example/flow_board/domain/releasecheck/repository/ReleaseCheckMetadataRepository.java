package com.example.flow_board.domain.releasecheck.repository;

import com.example.flow_board.domain.releasecheck.entity.ReleaseCheckMetadata;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReleaseCheckMetadataRepository extends JpaRepository<ReleaseCheckMetadata, Long> {
  Optional<ReleaseCheckMetadata> findByCard_Id(Long cardId);
}
