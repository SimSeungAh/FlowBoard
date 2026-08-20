package com.example.flow_board.domain.card.dto.response;

public record TestCaseSummaryResponse(

    long total,

    long notRun,

    long pass,

    long fail,

    long blocked

) {
}