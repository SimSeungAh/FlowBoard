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
import com.example.flow_board.domain.whiteboard.websocket.WhiteboardEventPublisher;
import com.example.flow_board.domain.whiteboard.websocket.WhiteboardWebSocketEvent;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WhiteboardObjectService {

  private final BoardRepository boardRepository;
  private final BoardPermissionService boardPermissionService;
  private final WhiteboardRepository whiteboardRepository;
  private final WhiteboardObjectRepository whiteboardObjectRepository;
  private final WhiteboardEventPublisher whiteboardEventPublisher;
  private final WhiteboardImageService whiteboardImageService;

  public List<WhiteboardObjectResponse> getObjects(
      User user,
      Long boardId,
      Long whiteboardId
  ) {
    Board board = getBoardById(boardId);
    boardPermissionService.validateReadPermission(board, user);
    Whiteboard whiteboard = getWhiteboardInBoard(board, whiteboardId);

    return whiteboardObjectRepository
        .findOrderedByWhiteboard(whiteboard)
        .stream()
        .map(WhiteboardObjectResponse::from)
        .toList();
  }

  @Transactional
  public WhiteboardObjectResponse createObject(
      User user,
      Long boardId,
      Long whiteboardId,
      WhiteboardObjectRequests.Create request
  ) {
    Board board = getBoardById(boardId);
    boardPermissionService.validateWritePermission(board, user);
    Whiteboard whiteboard = getWhiteboardInBoard(board, whiteboardId);
    validateWhiteboardEditable(whiteboard);

    boolean duplicated = whiteboardObjectRepository
        .existsByWhiteboardAndClientObjectId(whiteboard, request.clientObjectId());

    if (duplicated) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    int zIndex = request.zIndex() == null
        ? getNextZIndex(whiteboard)
        : request.zIndex();

    WhiteboardObject object = new WhiteboardObject(
        whiteboard,
        user,
        request.clientObjectId().trim(),
        request.type(),
        request.x(),
        request.y(),
        request.width(),
        request.height(),
        request.rotation(),
        normalizeContent(request.content()),
        normalizeOptionalText(request.fillColor()),
        normalizeOptionalText(request.strokeColor()),
        request.strokeWidth(),
        request.fontSize(),
        zIndex,
        normalizeOptionalText(request.propertiesJson())
    );

    WhiteboardObject saved = whiteboardObjectRepository.save(object);
    WhiteboardObjectResponse response = WhiteboardObjectResponse.from(saved);

    whiteboardEventPublisher.publish(
        WhiteboardWebSocketEvent.objectCreated(board.getId(), whiteboard.getId(), response)
    );

    return response;
  }

  @Transactional
  public WhiteboardObjectResponse updateObject(
      User user,
      Long boardId,
      Long whiteboardId,
      Long objectId,
      WhiteboardObjectRequests.Update request
  ) {
    Board board = getBoardById(boardId);
    boardPermissionService.validateWritePermission(board, user);
    Whiteboard whiteboard = getWhiteboardInBoard(board, whiteboardId);
    validateWhiteboardEditable(whiteboard);

    WhiteboardObject object = getObjectInWhiteboard(whiteboard, objectId);
    validateObjectEditable(object);

    object.update(
        request.x(),
        request.y(),
        request.width(),
        request.height(),
        request.rotation(),
        normalizeContent(request.content()),
        normalizeOptionalText(request.fillColor()),
        normalizeOptionalText(request.strokeColor()),
        request.strokeWidth(),
        request.fontSize(),
        request.zIndex(),
        normalizeOptionalText(request.propertiesJson())
    );

    WhiteboardObjectResponse response = WhiteboardObjectResponse.from(object);
    whiteboardEventPublisher.publish(
        WhiteboardWebSocketEvent.objectUpdated(board.getId(), whiteboard.getId(), response)
    );
    return response;
  }

  @Transactional
  public WhiteboardObjectResponse updateLayer(
      User user,
      Long boardId,
      Long whiteboardId,
      Long objectId,
      WhiteboardObjectRequests.Layer request
  ) {
    Board board = getBoardById(boardId);
    boardPermissionService.validateWritePermission(board, user);
    Whiteboard whiteboard = getWhiteboardInBoard(board, whiteboardId);
    validateWhiteboardEditable(whiteboard);

    WhiteboardObject object = getObjectInWhiteboard(whiteboard, objectId);
    validateObjectEditable(object);
    object.updateZIndex(request.zIndex());

    WhiteboardObjectResponse response = WhiteboardObjectResponse.from(object);
    whiteboardEventPublisher.publish(
        WhiteboardWebSocketEvent.objectUpdated(board.getId(), whiteboard.getId(), response)
    );
    return response;
  }

  @Transactional
  public WhiteboardObjectResponse updateLayerMetadata(
      User user,
      Long boardId,
      Long whiteboardId,
      Long objectId,
      WhiteboardObjectRequests.LayerMetadata request
  ) {
    Board board = getBoardById(boardId);
    boardPermissionService.validateWritePermission(board, user);
    Whiteboard whiteboard = getWhiteboardInBoard(board, whiteboardId);
    validateWhiteboardEditable(whiteboard);

    WhiteboardObject object = getObjectInWhiteboard(whiteboard, objectId);
    object.updateLayerMetadata(
        normalizeOptionalText(request.layerName()),
        request.visible()
    );

    WhiteboardObjectResponse response = WhiteboardObjectResponse.from(object);
    whiteboardEventPublisher.publish(
        WhiteboardWebSocketEvent.objectUpdated(board.getId(), whiteboard.getId(), response)
    );
    return response;
  }

  @Transactional
  public List<WhiteboardObjectResponse> reorderLayers(
      User user,
      Long boardId,
      Long whiteboardId,
      WhiteboardObjectRequests.LayerReorder request
  ) {
    Board board = getBoardById(boardId);
    boardPermissionService.validateWritePermission(board, user);
    Whiteboard whiteboard = getWhiteboardInBoard(board, whiteboardId);
    validateWhiteboardEditable(whiteboard);

    List<WhiteboardObject> currentObjects =
        whiteboardObjectRepository.findOrderedByWhiteboard(whiteboard);

    validateLayerOrder(currentObjects, request.objectIds());

    Map<Long, WhiteboardObject> byId = new HashMap<>();
    for (WhiteboardObject object : currentObjects) {
      byId.put(object.getId(), object);
    }

    for (int index = 0; index < request.objectIds().size(); index += 1) {
      WhiteboardObject object = byId.get(request.objectIds().get(index));
      object.updateZIndex(index);
    }

    List<WhiteboardObjectResponse> responses = request.objectIds()
        .stream()
        .map(byId::get)
        .map(WhiteboardObjectResponse::from)
        .toList();

    for (WhiteboardObjectResponse response : responses) {
      whiteboardEventPublisher.publish(
          WhiteboardWebSocketEvent.objectUpdated(board.getId(), whiteboard.getId(), response)
      );
    }

    return responses;
  }

  /**
   * 잠긴 객체는 내용/위치/크기/삭제가 차단되지만 잠금 자체는 변경할 수 있습니다.
   */
  @Transactional
  public WhiteboardObjectResponse updateLock(
      User user,
      Long boardId,
      Long whiteboardId,
      Long objectId,
      boolean locked
  ) {
    Board board = getBoardById(boardId);
    boardPermissionService.validateWritePermission(board, user);
    Whiteboard whiteboard = getWhiteboardInBoard(board, whiteboardId);
    validateWhiteboardEditable(whiteboard);

    WhiteboardObject object = getObjectInWhiteboard(whiteboard, objectId);
    object.updateLocked(locked);

    WhiteboardObjectResponse response = WhiteboardObjectResponse.from(object);
    whiteboardEventPublisher.publish(
        WhiteboardWebSocketEvent.objectUpdated(board.getId(), whiteboard.getId(), response)
    );
    return response;
  }

  @Transactional
  public void deleteObject(
      User user,
      Long boardId,
      Long whiteboardId,
      Long objectId
  ) {
    Board board = getBoardById(boardId);
    boardPermissionService.validateWritePermission(board, user);
    Whiteboard whiteboard = getWhiteboardInBoard(board, whiteboardId);
    validateWhiteboardEditable(whiteboard);

    WhiteboardObject object = getObjectInWhiteboard(whiteboard, objectId);
    validateObjectEditable(object);
    whiteboardObjectRepository.delete(object);
    whiteboardImageService.deleteStoredImageQuietly(object);

    whiteboardEventPublisher.publish(
        WhiteboardWebSocketEvent.objectDeleted(board.getId(), whiteboard.getId(), objectId)
    );
  }

  private void validateLayerOrder(
      List<WhiteboardObject> currentObjects,
      List<Long> requestedIds
  ) {
    if (currentObjects.size() != requestedIds.size()) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    Set<Long> requestedSet = new HashSet<>(requestedIds);
    if (requestedSet.size() != requestedIds.size()) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    Set<Long> currentSet = new HashSet<>();
    for (WhiteboardObject object : currentObjects) {
      currentSet.add(object.getId());
    }

    if (!currentSet.equals(requestedSet)) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }
  }

  private int getNextZIndex(Whiteboard whiteboard) {
    Integer maxZIndex = whiteboardObjectRepository.findMaxZIndexByWhiteboard(whiteboard);
    return maxZIndex == null ? 0 : maxZIndex + 1;
  }

  private void validateWhiteboardEditable(Whiteboard whiteboard) {
    if (whiteboard.isLocked()) {
      throw new CustomException(ErrorCode.WHITEBOARD_LOCKED);
    }
  }

  private void validateObjectEditable(WhiteboardObject object) {
    if (object.isLocked()) {
      throw new CustomException(ErrorCode.WHITEBOARD_OBJECT_LOCKED);
    }
  }

  private WhiteboardObject getObjectInWhiteboard(Whiteboard whiteboard, Long objectId) {
    return whiteboardObjectRepository
        .findByIdAndWhiteboard(objectId, whiteboard)
        .orElseThrow(() -> new CustomException(ErrorCode.INVALID_INPUT));
  }

  private Whiteboard getWhiteboardInBoard(Board board, Long whiteboardId) {
    return whiteboardRepository
        .findByIdAndBoard(whiteboardId, board)
        .orElseThrow(() -> new CustomException(ErrorCode.WHITEBOARD_NOT_FOUND));
  }

  private Board getBoardById(Long boardId) {
    return boardRepository
        .findById(boardId)
        .orElseThrow(() -> new CustomException(ErrorCode.BOARD_NOT_FOUND));
  }

  private String normalizeContent(String value) {
    return value;
  }

  private String normalizeOptionalText(String value) {
    if (value == null) {
      return null;
    }
    String normalized = value.trim();
    return normalized.isEmpty() ? null : normalized;
  }
}
