package com.example.flow_board.domain.board.service;

import com.example.flow_board.domain.board.dto.request.BoardColumnRequests;
import com.example.flow_board.domain.board.dto.response.BoardColumnResponse;
import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.entity.BoardColumn;
import com.example.flow_board.domain.board.repository.BoardColumnRepository;
import com.example.flow_board.domain.board.repository.BoardRepository;
import com.example.flow_board.domain.card.repository.CardRepository;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BoardColumnService {

    private final BoardRepository boardRepository;

    private final BoardColumnRepository boardColumnRepository;

    private final CardRepository cardRepository;

    private final BoardPermissionService boardPermissionService;

    /**
     * 컬럼 목록 조회
     *
     * OWNER / MEMBER / VIEWER 모두 가능합니다.
     */
    public List<BoardColumnResponse> getColumns(
            User user,
            Long boardId
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

        return getOrderedColumns(
                board
        )
                .stream()
                .map(
                        BoardColumnResponse::from
                )
                .toList();
    }

    /**
     * 컬럼 추가
     *
     * 워크플로우의 구조를 변경하는 기능이므로
     * OWNER만 가능합니다.
     */
    @Transactional
    public BoardColumnResponse createColumn(
            User user,
            Long boardId,
            BoardColumnRequests.Create request
    ) {
        Board board =
                getBoardById(
                        boardId
                );

        boardPermissionService
                .validateOwnerPermission(
                        board,
                        user
                );

        List<BoardColumn> columns =
                getOrderedColumns(
                        board
                );

        int nextPosition =
                columns
                        .stream()
                        .map(
                                BoardColumn::getPosition
                        )
                        .filter(
                                Objects::nonNull
                        )
                        .max(
                                Integer::compareTo
                        )
                        .map(
                                position ->
                                        position + 1
                        )
                        .orElse(
                                0
                        );

        BoardColumn column =
                new BoardColumn(
                        board,
                        normalizeTitle(
                                request.title()
                        ),
                        nextPosition
                );

        BoardColumn savedColumn =
                boardColumnRepository
                        .save(
                                column
                        );

        return BoardColumnResponse.from(
                savedColumn
        );
    }

    /**
     * 컬럼 이름 변경
     *
     * OWNER만 가능합니다.
     */
    @Transactional
    public BoardColumnResponse updateColumn(
            User user,
            Long boardId,
            Long columnId,
            BoardColumnRequests.Update request
    ) {
        Board board =
                getBoardById(
                        boardId
                );

        boardPermissionService
                .validateOwnerPermission(
                        board,
                        user
                );

        BoardColumn column =
                getColumnInBoard(
                        board,
                        columnId
                );

        column.updateTitle(
                normalizeTitle(
                        request.title()
                )
        );

        return BoardColumnResponse.from(
                column
        );
    }

    /**
     * 컬럼 삭제
     *
     * OWNER만 가능합니다.
     *
     * 안전 규칙:
     * 1. 마지막 컬럼은 삭제할 수 없습니다.
     * 2. 작업이 남아 있는 컬럼은 삭제할 수 없습니다.
     *
     * 카드가 들어 있는 컬럼을 통째로 삭제하면
     * 작업 데이터도 함께 손상될 수 있기 때문에
     * 자동 삭제하지 않습니다.
     */
    @Transactional
    public void deleteColumn(
            User user,
            Long boardId,
            Long columnId
    ) {
        Board board =
                getBoardById(
                        boardId
                );

        boardPermissionService
                .validateOwnerPermission(
                        board,
                        user
                );

        List<BoardColumn> columns =
                getOrderedColumns(
                        board
                );

        if (
                columns.size() <= 1
        ) {
            throw new CustomException(
                    ErrorCode.LAST_COLUMN_CANNOT_BE_DELETED
            );
        }

        BoardColumn targetColumn =
                columns
                        .stream()
                        .filter(
                                column ->
                                        Objects.equals(
                                                column.getId(),
                                                columnId
                                        )
                        )
                        .findFirst()
                        .orElseThrow(
                                () ->
                                        new CustomException(
                                                ErrorCode.COLUMN_NOT_FOUND
                                        )
                        );

        long cardCount =
                cardRepository
                        .countByBoardColumn(
                                targetColumn
                        );

        if (
                cardCount > 0
        ) {
            throw new CustomException(
                    ErrorCode.COLUMN_NOT_EMPTY
            );
        }

        boardColumnRepository.delete(
                targetColumn
        );

        List<BoardColumn> remainingColumns =
                columns
                        .stream()
                        .filter(
                                column ->
                                        !Objects.equals(
                                                column.getId(),
                                                targetColumn.getId()
                                        )
                        )
                        .toList();

        normalizePositions(
                remainingColumns
        );
    }

    /**
     * 컬럼 순서 변경
     *
     * 프론트는 현재 보드에 존재하는 모든 컬럼 ID를
     * 원하는 순서대로 전달합니다.
     *
     * 예:
     *
     * 기존:
     * [1, 2, 3]
     *
     * 변경:
     * [2, 1, 3]
     */
    @Transactional
    public List<BoardColumnResponse> reorderColumns(
            User user,
            Long boardId,
            BoardColumnRequests.Reorder request
    ) {
        Board board =
                getBoardById(
                        boardId
                );

        boardPermissionService
                .validateOwnerPermission(
                        board,
                        user
                );

        List<BoardColumn> currentColumns =
                getOrderedColumns(
                        board
                );

        List<Long> requestedIds =
                request.columnIds();

        validateColumnOrder(
                currentColumns,
                requestedIds
        );

        Map<Long, BoardColumn> columnById =
                new HashMap<>();

        for (
                BoardColumn column :
                currentColumns
        ) {
            columnById.put(
                    column.getId(),
                    column
            );
        }

        for (
                int index = 0;
                index < requestedIds.size();
                index += 1
        ) {
            Long columnId =
                    requestedIds.get(
                            index
                    );

            BoardColumn column =
                    columnById.get(
                            columnId
                    );

            if (
                    column == null
            ) {
                throw new CustomException(
                        ErrorCode.INVALID_COLUMN_ORDER
                );
            }

            column.updatePosition(
                    index
            );
        }

        return requestedIds
                .stream()
                .map(
                        columnById::get
                )
                .map(
                        BoardColumnResponse::from
                )
                .toList();
    }

    /**
     * 요청받은 순서가 현재 보드의 컬럼과
     * 정확히 일치하는지 확인합니다.
     */
    private void validateColumnOrder(
            List<BoardColumn> currentColumns,
            List<Long> requestedIds
    ) {
        if (
                currentColumns.size()
                        != requestedIds.size()
        ) {
            throw new CustomException(
                    ErrorCode.INVALID_COLUMN_ORDER
            );
        }

        Set<Long> requestedIdSet =
                new HashSet<>(
                        requestedIds
                );

        /*
         * 중복 ID가 있으면 Set 크기가 줄어듭니다.
         */
        if (
                requestedIdSet.size()
                        != requestedIds.size()
        ) {
            throw new CustomException(
                    ErrorCode.INVALID_COLUMN_ORDER
            );
        }

        Set<Long> currentIdSet =
                currentColumns
                        .stream()
                        .map(
                                BoardColumn::getId
                        )
                        .collect(
                                Collectors.toSet()
                        );

        if (
                !currentIdSet.equals(
                        requestedIdSet
                )
        ) {
            throw new CustomException(
                    ErrorCode.INVALID_COLUMN_ORDER
            );
        }
    }

    /**
     * 컬럼 삭제 후 position을
     * 0부터 다시 연속적으로 정리합니다.
     */
    private void normalizePositions(
            List<BoardColumn> columns
    ) {
        for (
                int index = 0;
                index < columns.size();
                index += 1
        ) {
            columns
                    .get(
                            index
                    )
                    .updatePosition(
                            index
                    );
        }
    }

    private String normalizeTitle(
            String title
    ) {
        return title.trim();
    }

    private List<BoardColumn> getOrderedColumns(
            Board board
    ) {
        return boardColumnRepository
                .findByBoardOrderByPositionAsc(
                        board
                );
    }

    /**
     * 해당 컬럼이 진짜 현재 보드 소속인지까지 확인합니다.
     */
    private BoardColumn getColumnInBoard(
            Board board,
            Long columnId
    ) {
        BoardColumn column =
                boardColumnRepository
                        .findById(
                                columnId
                        )
                        .orElseThrow(
                                () ->
                                        new CustomException(
                                                ErrorCode.COLUMN_NOT_FOUND
                                        )
                        );

        if (
                !Objects.equals(
                        column
                                .getBoard()
                                .getId(),
                        board.getId()
                )
        ) {
            throw new CustomException(
                    ErrorCode.COLUMN_NOT_FOUND
            );
        }

        return column;
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
}