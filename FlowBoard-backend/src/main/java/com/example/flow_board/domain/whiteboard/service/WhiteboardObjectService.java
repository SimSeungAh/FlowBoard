package com.example.flow_board.domain.whiteboard.service;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.repository.BoardRepository;
import com.example.flow_board.domain.board.service.BoardPermissionService;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.domain.whiteboard.dto.request.WhiteboardObjectRequests;
import com.example.flow_board.domain.whiteboard.dto.response.WhiteboardObjectResponse;
import com.example.flow_board.domain.whiteboard.entity.Whiteboard;
import com.example.flow_board.domain.whiteboard.entity.WhiteboardObject;
import com.example.flow_board.domain.whiteboard.repository.WhiteboardObjectRepository;
import com.example.flow_board.domain.whiteboard.repository.WhiteboardRepository;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WhiteboardObjectService {

  private final BoardRepository boardRepository;

  private final BoardPermissionService boardPermissionService;

  private final WhiteboardRepository whiteboardRepository;

  private final WhiteboardObjectRepository whiteboardObjectRepository;

  /**
   * 현재 화이트보드의 객체 목록 조회
   */
  public List<WhiteboardObjectResponse> getObjects(
      User user,
      Long boardId,
      Long whiteboardId
  ) {
    Board board =
        getBoardById(
            boardId
        );

    boardPermissionService
        .validateReadPermission(
            board,
            user
        );

    Whiteboard whiteboard =
        getWhiteboardInBoard(
            board,
            whiteboardId
        );

    return whiteboardObjectRepository
        .findOrderedByWhiteboard(
            whiteboard
        )
        .stream()
        .map(
            WhiteboardObjectResponse::from
        )
        .toList();
  }

  /**
   * 객체 생성
   */
  @Transactional
  public WhiteboardObjectResponse createObject(
      User user,
      Long boardId,
      Long whiteboardId,
      WhiteboardObjectRequests.Create request
  ) {
    Board board =
        getBoardById(
            boardId
        );

    boardPermissionService
        .validateWritePermission(
            board,
            user
        );

    Whiteboard whiteboard =
        getWhiteboardInBoard(
            board,
            whiteboardId
        );

    boolean duplicated =
        whiteboardObjectRepository
            .existsByWhiteboardAndClientObjectId(
                whiteboard,
                request.clientObjectId()
            );

    if (duplicated) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT
      );
    }

    int zIndex =
        request.zIndex() == null
            ? getNextZIndex(
            whiteboard
        )
            : request.zIndex();

    WhiteboardObject object =
        new WhiteboardObject(
            whiteboard,
            user,
            request.clientObjectId().trim(),
            request.type(),
            request.x(),
            request.y(),
            request.width(),
            request.height(),
            request.rotation(),
            normalizeContent(
                request.content()
            ),
            normalizeOptionalText(
                request.fillColor()
            ),
            normalizeOptionalText(
                request.strokeColor()
            ),
            request.strokeWidth(),
            request.fontSize(),
            zIndex,
            normalizeOptionalText(
                request.propertiesJson()
            )
        );

    WhiteboardObject saved =
        whiteboardObjectRepository
            .save(
                object
            );

    return WhiteboardObjectResponse.from(
        saved
    );
  }

  /**
   * 객체 전체 상태 수정
   */
  @Transactional
  public WhiteboardObjectResponse updateObject(
      User user,
      Long boardId,
      Long whiteboardId,
      Long objectId,
      WhiteboardObjectRequests.Update request
  ) {
    Board board =
        getBoardById(
            boardId
        );

    boardPermissionService
        .validateWritePermission(
            board,
            user
        );

    Whiteboard whiteboard =
        getWhiteboardInBoard(
            board,
            whiteboardId
        );

    WhiteboardObject object =
        getObjectInWhiteboard(
            whiteboard,
            objectId
        );

    object.update(
        request.x(),
        request.y(),
        request.width(),
        request.height(),
        request.rotation(),
        normalizeContent(
            request.content()
        ),
        normalizeOptionalText(
            request.fillColor()
        ),
        normalizeOptionalText(
            request.strokeColor()
        ),
        request.strokeWidth(),
        request.fontSize(),
        request.zIndex(),
        normalizeOptionalText(
            request.propertiesJson()
        )
    );

    return WhiteboardObjectResponse.from(
        object
    );
  }

  /**
   * 객체 레이어 수정
   */
  @Transactional
  public WhiteboardObjectResponse updateLayer(
      User user,
      Long boardId,
      Long whiteboardId,
      Long objectId,
      WhiteboardObjectRequests.Layer request
  ) {
    Board board =
        getBoardById(
            boardId
        );

    boardPermissionService
        .validateWritePermission(
            board,
            user
        );

    Whiteboard whiteboard =
        getWhiteboardInBoard(
            board,
            whiteboardId
        );

    WhiteboardObject object =
        getObjectInWhiteboard(
            whiteboard,
            objectId
        );

    object.updateZIndex(
        request.zIndex()
    );

    return WhiteboardObjectResponse.from(
        object
    );
  }

  /**
   * 객체 삭제
   */
  @Transactional
  public void deleteObject(
      User user,
      Long boardId,
      Long whiteboardId,
      Long objectId
  ) {
    Board board =
        getBoardById(
            boardId
        );

    boardPermissionService
        .validateWritePermission(
            board,
            user
        );

    Whiteboard whiteboard =
        getWhiteboardInBoard(
            board,
            whiteboardId
        );

    WhiteboardObject object =
        getObjectInWhiteboard(
            whiteboard,
            objectId
        );

    whiteboardObjectRepository
        .delete(
            object
        );
  }

  /**
   * 새 객체가 사용할 다음 zIndex 계산.
   *
   * 기존에는
   *
   * findFirstByWhiteboardOrderByZIndexDescIdDesc()
   *
   * 파생 쿼리를 사용했지만,
   * Spring Data JPA 4가 zIndex를 ZIndex로
   * 잘못 해석할 수 있어 MAX JPQL 방식으로 변경합니다.
   */
  private int getNextZIndex(
      Whiteboard whiteboard
  ) {
    Integer maxZIndex =
        whiteboardObjectRepository
            .findMaxZIndexByWhiteboard(
                whiteboard
            );

    return maxZIndex == null
        ? 0
        : maxZIndex + 1;
  }

  private WhiteboardObject getObjectInWhiteboard(
      Whiteboard whiteboard,
      Long objectId
  ) {
    return whiteboardObjectRepository
        .findByIdAndWhiteboard(
            objectId,
            whiteboard
        )
        .orElseThrow(
            () ->
                new CustomException(
                    ErrorCode.INVALID_INPUT
                )
        );
  }

  private Whiteboard getWhiteboardInBoard(
      Board board,
      Long whiteboardId
  ) {
    return whiteboardRepository
        .findByIdAndBoard(
            whiteboardId,
            board
        )
        .orElseThrow(
            () ->
                new CustomException(
                    ErrorCode.WHITEBOARD_NOT_FOUND
                )
        );
  }

  private Board getBoardById(
      Long boardId
  ) {
    return boardRepository
        .findById(
            boardId
        )
        .orElseThrow(
            () ->
                new CustomException(
                    ErrorCode.BOARD_NOT_FOUND
                )
        );
  }

  private String normalizeContent(
      String value
  ) {
    if (value == null) {
      return null;
    }

    return value;
  }

  private String normalizeOptionalText(
      String value
  ) {
    if (value == null) {
      return null;
    }

    String normalized =
        value.trim();

    return normalized.isEmpty()
        ? null
        : normalized;
  }
}