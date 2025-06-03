package com.example.prova.model

data class JoinRequestResponse(
    val message: String,
    val data: JoinRequestData
)

data class JoinRequestData(
    val requestId: String,
    val roomId: String
)