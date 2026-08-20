package com.example.flow_board.domain.card.entity;

import com.example.flow_board.global.exception.CustomException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CardTest {

  @Test
  void taskType이_없으면_일반_카드로_생성된다() {
    Card card = new Card(
        null,
        null,
        "일반 작업",
        null,
        "0|hzzzzz:",
        null,
        null,
        null,
        null
    );

    assertEquals(
        CardTaskType.GENERAL,
        card.getTaskType()
    );

    assertNull(
        card.getTestCaseType()
    );

    assertNull(
        card.getTestCaseResult()
    );
  }

  @Test
  void 일반_작업이_아니어도_테스트케이스가_아니면_테스트_메타데이터를_비운다() {
    Card card = new Card(
        null,
        null,
        "보안 점검",
        null,
        "0|hzzzzz:",
        null,
        CardTaskType.SECURITY_REVIEW,
        TestCaseType.SECURITY,
        TestCaseResult.PASS
    );

    assertEquals(
        CardTaskType.SECURITY_REVIEW,
        card.getTaskType()
    );

    assertNull(
        card.getTestCaseType()
    );

    assertNull(
        card.getTestCaseResult()
    );
  }

  @Test
  void 테스트케이스_유형이_없으면_생성을_차단한다() {
    assertThrows(
        CustomException.class,
        () -> new Card(
            null,
            null,
            "로그인 정상 시나리오",
            null,
            "0|hzzzzz:",
            null,
            CardTaskType.TEST_CASE,
            null,
            null
        )
    );
  }

  @Test
  void 테스트케이스_결과를_생략하면_미실행으로_시작한다() {
    Card card = new Card(
        null,
        null,
        "로그인 정상 시나리오",
        null,
        "0|hzzzzz:",
        null,
        CardTaskType.TEST_CASE,
        TestCaseType.NORMAL,
        null
    );

    assertEquals(
        CardTaskType.TEST_CASE,
        card.getTaskType()
    );

    assertEquals(
        TestCaseType.NORMAL,
        card.getTestCaseType()
    );

    assertEquals(
        TestCaseResult.NOT_RUN,
        card.getTestCaseResult()
    );
  }

  @Test
  void 테스트케이스_유형과_결과를_지정하면_그대로_저장한다() {
    Card card = new Card(
        null,
        null,
        "결제 E2E",
        null,
        "0|hzzzzz:",
        null,
        CardTaskType.TEST_CASE,
        TestCaseType.E2E,
        TestCaseResult.FAIL
    );

    assertEquals(
        CardTaskType.TEST_CASE,
        card.getTaskType()
    );

    assertEquals(
        TestCaseType.E2E,
        card.getTestCaseType()
    );

    assertEquals(
        TestCaseResult.FAIL,
        card.getTestCaseResult()
    );
  }
}