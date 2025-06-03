package com.example.prova.model

data class RoomDetailsResponse(
    val message: String,
    val data: RoomData
)

data class RoomData(
    val roomId: String,
    val members: List<Member>,
    val createdAt: String
)

data class Member(
    val publicId: String,
    val username: String
)