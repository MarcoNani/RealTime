package com.example.prova.model

data class CreateRoomResponse(
    val message: String,
    val data: RoomDataShort
)

data class RoomDataShort(
    val roomId: String
)