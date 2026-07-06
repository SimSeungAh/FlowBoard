package com.example.flow_board.domain.board.entity;

import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
    name="board_members",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_board_member_board_user",
            columnNames = {"board_id", "user_id"}
        )
    }
)

@NoArgsConstructor(access =  AccessLevel.PROTECTED)
public class BoardMember extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BoardRole role;

    public BoardMember(Board board, User user, BoardRole role) {
        this.board = board;
        this.user = user;
        this.role = role;
    }

    public void changeRole(BoardRole role) {
        this.role = role;
    }

}
