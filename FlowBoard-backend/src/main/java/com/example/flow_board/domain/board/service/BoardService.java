package com.example.flow_board.domain.board.service;

import com.example.flow_board.domain.board.dto.request.BoardCreateRequest;
import com.example.flow_board.domain.board.dto.request.BoardUpdateRequest;
import com.example.flow_board.domain.board.dto.response.BoardColumnResponse;
import com.example.flow_board.domain.board.dto.response.BoardDetailResponse;
import com.example.flow_board.domain.board.dto.response.BoardResponse;
import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.entity.BoardColumn;
import com.example.flow_board.domain.board.entity.BoardMember;
import com.example.flow_board.domain.board.entity.BoardRole;
import com.example.flow_board.domain.board.repository.BoardColumnRepository;
import com.example.flow_board.domain.board.repository.BoardMemberRepository;
import com.example.flow_board.domain.board.repository.BoardRepository;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BoardService {

  private final BoardRepository boardRepository;
  private final BoardMemberRepository boardMemberRepository;
  private final BoardColumnRepository boardColumnRepository;

  @Transactional
  public BoardResponse createBoard(User user, BoardCreateRequest request) {
    Board board = new Board(
        user,
        request.title(),
        request.description()
    );

    Board savedBoard = boardRepository.save(board);

    BoardMember ownerMember = new BoardMember(
        savedBoard,
        user,
        BoardRole.OWNER
    );

    boardMemberRepository.save(ownerMember);

    createDefaultColumns(savedBoard);

    return BoardResponse.from(savedBoard);
  }

  public List<BoardResponse> getMyBoards(User user) {
    return boardRepository.findByOwnerOrderByCreatedAtDesc(user)
        .stream()
        .map(BoardResponse::from)
        .toList();
  }

  public BoardDetailResponse getBoardDetail(User user, Long boardId) {
    Board board = getBoardById(boardId);
    validateBoardOwner(board, user);

    List<BoardColumnResponse> columns = boardColumnRepository
        .findByBoardOrderByPositionAsc(board)
        .stream()
        .map(BoardColumnResponse::from)
        .toList();

    return BoardDetailResponse.from(board, columns);
  }

  @Transactional
  public BoardResponse updateBoard(User user, Long boardId, BoardUpdateRequest request) {
    Board board = getBoardById(boardId);
    validateBoardOwner(board, user);

    String backgroundColor = request.backgroundColor();

    if (backgroundColor == null || backgroundColor.isBlank()) {
      backgroundColor = board.getBackgroundColor();
    }

    board.update(
        request.title(),
        request.description(),
        backgroundColor
    );

    return BoardResponse.from(board);
  }

  @Transactional
  public void deleteBoard(User user, Long boardId) {
    Board board = getBoardById(boardId);
    validateBoardOwner(board, user);

    List<BoardColumn> boardColumns = boardColumnRepository.findByBoardOrderByPositionAsc(board);
    boardColumnRepository.deleteAll(boardColumns);

    List<BoardMember> boardMembers = boardMemberRepository.findByBoard(board);
    boardMemberRepository.deleteAll(boardMembers);

    boardRepository.delete(board);
  }

  private void createDefaultColumns(Board board) {
    List<BoardColumn> defaultColumns = List.of(
        new BoardColumn(board, "할일", 0),
        new BoardColumn(board, "진행중", 1),
        new BoardColumn(board, "완료", 2)
    );

    boardColumnRepository.saveAll(defaultColumns);
  }

  private Board getBoardById(Long boardId) {
    return boardRepository.findById(boardId)
        .orElseThrow(() -> new CustomException(ErrorCode.BOARD_NOT_FOUND));
  }

  private void validateBoardOwner(Board board, User user) {
    if (!Objects.equals(board.getOwner().getId(), user.getId())) {
      throw new CustomException(ErrorCode.BOARD_ACCESS_DENIED);
    }
  }
}