package com.example.prova.model

data class ApiResponse(
    val message: String,
    val data: ApiData
)

data class ApiData(
    val apiKey: String,
    val username: String
)
