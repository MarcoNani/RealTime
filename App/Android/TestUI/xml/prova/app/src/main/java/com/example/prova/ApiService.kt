package com.example.prova.api

import com.example.prova.model.*
import retrofit2.Call
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Headers
import retrofit2.http.POST
import retrofit2.http.Path

interface ApiService {
    @POST("/api/v1/users/api-key/")
    fun registerUser(@Body request: UserRequest): Call<ApiResponse>

    // @Headers("Content-Type: application/json")
    @POST("/api/v1/rooms")
    suspend fun createRoom(): Response<CreateRoomResponse>

    @POST("/api/v1/rooms/{roomId}/join-requests")
    suspend fun sendJoinRequest(
        @Path("roomId") roomId: String
    ): Response<JoinRequestResponse>

    @GET("/api/v1/rooms/{roomId}")
    suspend fun getRoomDetails(
        @Path("roomId") roomId: String
    ): Response<RoomDetailsResponse>
}
