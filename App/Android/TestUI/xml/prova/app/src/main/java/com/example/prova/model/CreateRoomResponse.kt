package com.example.prova.model

data class CreateRoomResponse(
    val message: String,
    val data: RoomData
)

data class RoomData(
    val roomId: String
)