package com.example.prova.api

import com.example.prova.model.*
import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.Headers
import retrofit2.http.POST

interface ApiService {
    @POST("/api/v1/users/api-key/")
    fun registerUser(@Body request: UserRequest): Call<ApiResponse>

    @Headers("Content-Type: application/json")
    @POST("/api/v1/rooms")
    fun createRoom(): Call<CreateRoomResponse>
}
