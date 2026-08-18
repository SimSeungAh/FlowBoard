package com.example.flow_board.global.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

  /*
   * COMMON
   */
  INVALID_INPUT(
          HttpStatus.BAD_REQUEST,
          "COMMON_001",
          "잘못된 입력입니다."
  ),

  INTERNAL_SERVER_ERROR(
          HttpStatus.INTERNAL_SERVER_ERROR,
          "SERVER_001",
          "서버 내부 오류가 발생했습니다."
  ),

  /*
   * AUTH
   */
  UNAUTHORIZED(
          HttpStatus.UNAUTHORIZED,
          "AUTH_001",
          "인증이 필요합니다."
  ),

  FORBIDDEN(
          HttpStatus.FORBIDDEN,
          "AUTH_002",
          "접근 권한이 없습니다."
  ),

  /*
   * USER
   */
  EMAIL_ALREADY_EXISTS(
          HttpStatus.BAD_REQUEST,
          "USER_001",
          "이미 사용 중인 이메일입니다."
  ),

  USER_NOT_FOUND(
          HttpStatus.NOT_FOUND,
          "USER_002",
          "사용자를 찾을 수 없습니다."
  ),

  PASSWORD_NOT_MATCH(
          HttpStatus.UNAUTHORIZED,
          "USER_003",
          "비밀번호가 일치하지 않습니다."
  ),

  /*
   * BOARD
   */
  BOARD_NOT_FOUND(
          HttpStatus.NOT_FOUND,
          "BOARD_001",
          "보드를 찾을 수 없습니다."
  ),

  BOARD_ACCESS_DENIED(
          HttpStatus.FORBIDDEN,
          "BOARD_002",
          "보드에 접근할 권한이 없습니다."
  ),

  /*
   * BOARD MEMBER
   */
  BOARD_MEMBER_NOT_FOUND(
          HttpStatus.NOT_FOUND,
          "BOARD_MEMBER_001",
          "보드 멤버를 찾을 수 없습니다."
  ),

  BOARD_MEMBER_ALREADY_EXISTS(
          HttpStatus.CONFLICT,
          "BOARD_MEMBER_002",
          "이미 보드에 참여 중인 사용자입니다."
  ),

  BOARD_OWNER_ROLE_NOT_ALLOWED(
          HttpStatus.BAD_REQUEST,
          "BOARD_MEMBER_003",
          "OWNER 역할로 초대할 수 없습니다."
  ),

  BOARD_OWNER_ROLE_CANNOT_BE_CHANGED(
          HttpStatus.BAD_REQUEST,
          "BOARD_MEMBER_004",
          "보드 소유자의 역할은 변경할 수 없습니다."
  ),

  BOARD_OWNER_CANNOT_BE_REMOVED(
          HttpStatus.BAD_REQUEST,
          "BOARD_MEMBER_005",
          "보드 소유자는 멤버에서 제거할 수 없습니다."
  ),

  /*
   * COLUMN
   */
  COLUMN_NOT_FOUND(
          HttpStatus.NOT_FOUND,
          "COLUMN_001",
          "컬럼을 찾을 수 없습니다."
  ),

  COLUMN_NOT_EMPTY(
          HttpStatus.CONFLICT,
          "COLUMN_002",
          "작업이 남아 있는 컬럼은 삭제할 수 없습니다."
  ),

  LAST_COLUMN_CANNOT_BE_DELETED(
          HttpStatus.BAD_REQUEST,
          "COLUMN_003",
          "보드에는 최소 1개의 컬럼이 필요합니다."
  ),

  INVALID_COLUMN_ORDER(
          HttpStatus.BAD_REQUEST,
          "COLUMN_004",
          "컬럼 순서 정보가 올바르지 않습니다."
  ),

  /*
   * CARD
   */
  CARD_NOT_FOUND(
          HttpStatus.NOT_FOUND,
          "CARD_001",
          "카드를 찾을 수 없습니다."
  ),

  /*
   * COMMENT
   */
  COMMENT_NOT_FOUND(
          HttpStatus.NOT_FOUND,
          "COMMENT_001",
          "댓글을 찾을 수 없습니다."
  ),

  COMMENT_ACCESS_DENIED(
          HttpStatus.FORBIDDEN,
          "COMMENT_002",
          "댓글을 수정하거나 삭제할 권한이 없습니다."
  ),

  /*
   * CHECKLIST
   */
  CHECKLIST_NOT_FOUND(
          HttpStatus.NOT_FOUND,
          "CHECKLIST_001",
          "체크리스트를 찾을 수 없습니다."
  ),

  CHECKLIST_ITEM_NOT_FOUND(
          HttpStatus.NOT_FOUND,
          "CHECKLIST_ITEM_001",
          "체크리스트 항목을 찾을 수 없습니다."
  ),

  /*
   * CARD ASSIGNEE
   */
  CARD_ASSIGNEE_NOT_FOUND(
          HttpStatus.NOT_FOUND,
          "CARD_ASSIGNEE_001",
          "카드 담당자를 찾을 수 없습니다."
  ),

  CARD_ASSIGNEE_ALREADY_EXISTS(
          HttpStatus.CONFLICT,
          "CARD_ASSIGNEE_002",
          "이미 카드 담당자로 등록된 사용자입니다."
  ),

  ASSIGNEE_NOT_BOARD_MEMBER(
          HttpStatus.BAD_REQUEST,
          "CARD_ASSIGNEE_003",
          "보드 멤버만 담당자로 지정할 수 있습니다."
  ),

  /*
   * TAG
   */
  TAG_NOT_FOUND(
          HttpStatus.NOT_FOUND,
          "TAG_001",
          "태그를 찾을 수 없습니다."
  ),

  TAG_ALREADY_EXISTS(
          HttpStatus.CONFLICT,
          "TAG_002",
          "이미 존재하는 태그입니다."
  ),

  CARD_TAG_NOT_FOUND(
          HttpStatus.NOT_FOUND,
          "CARD_TAG_001",
          "카드에 연결된 태그를 찾을 수 없습니다."
  ),

  /*
   * WHITEBOARD
   */
  WHITEBOARD_STROKE_ALREADY_EXISTS(
          HttpStatus.CONFLICT,
          "WHITEBOARD_001",
          "이미 저장된 화이트보드 선입니다."
  ),

  WHITEBOARD_WRITE_ACCESS_DENIED(
          HttpStatus.FORBIDDEN,
          "WHITEBOARD_002",
          "화이트보드를 수정할 권한이 없습니다."
  ),

  WHITEBOARD_DATA_PROCESSING_FAILED(
          HttpStatus.INTERNAL_SERVER_ERROR,
          "WHITEBOARD_003",
          "화이트보드 데이터를 처리하는 중 오류가 발생했습니다."
  ),

  WHITEBOARD_STROKE_NOT_FOUND(
          HttpStatus.NOT_FOUND,
          "WHITEBOARD_004",
          "화이트보드 선을 찾을 수 없습니다."
  ),

  /*
   * TOKEN
   */
  INVALID_TOKEN(
          HttpStatus.UNAUTHORIZED,
          "TOKEN_001",
          "유효하지 않은 토큰입니다."
  ),

  EXPIRED_TOKEN(
          HttpStatus.UNAUTHORIZED,
          "TOKEN_002",
          "만료된 토큰입니다."
  ),

  UNSUPPORTED_TOKEN(
          HttpStatus.UNAUTHORIZED,
          "TOKEN_003",
          "지원하지 않는 토큰입니다."
  ),

  EMPTY_TOKEN(
          HttpStatus.UNAUTHORIZED,
          "TOKEN_004",
          "토큰이 존재하지 않습니다."
  );

  private final HttpStatus status;

  private final String code;

  private final String message;

  ErrorCode(
          HttpStatus status,
          String code,
          String message
  ) {
    this.status = status;

    this.code = code;

    this.message = message;
  }
}