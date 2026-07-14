package com.example.flow_board.domain.card.util;

import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;

import java.math.BigInteger;

public final class LexoRankUtil {
  private static final int BASE = 36;
  private static final int LENGTH = 10;

  private static final BigInteger MIN = BigInteger.ZERO;
  private static final BigInteger MAX = BigInteger.valueOf(BASE).pow(LENGTH).subtract(BigInteger.ONE);
  private static final BigInteger TWO = BigInteger.valueOf(2);

  private LexoRankUtil() {

  }

  public static String between(String prevRank, String nextRank) {
    BigInteger prev = prevRank == null ? MIN : parse(prevRank);
    BigInteger next = nextRank == null ? MAX : parse(nextRank);

    if(next.subtract(prev).compareTo(BigInteger.ONE) <= 0) {
      throw new IllegalArgumentException("rank 사이에 공간이 없습니다.");
    }

    BigInteger middle = prev.add(next).divide(TWO);
    return format(middle);
  }

  public static boolean hasSpace(String prevRank, String nextRank) {
    BigInteger prev = prevRank == null ?MIN : parse(prevRank);
    BigInteger next = nextRank == null ? MAX : parse(nextRank);

    return next.subtract(prev).compareTo(BigInteger.ONE) > 0;
  }

  public static String rankAt(int index, int totalCount){
    BigInteger interval = MAX.divide(BigInteger.valueOf(totalCount+1L));
    BigInteger value = interval.multiply(BigInteger.valueOf(index+1L));
    return format(value);
  }

  private static BigInteger parse(String rank) {
    return new BigInteger(rank, BASE);
  }

  private static String format(BigInteger value) {
    String rank = value.toString(BASE).toUpperCase();

    return "0".repeat(LENGTH - rank.length()) + rank;
  }
}
