package com.example.prova.api

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Request
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitProvider {

    fun provideRetrofit(baseUrl: String, apiKey: String? = null): Retrofit {
        val clientBuilder = OkHttpClient.Builder()
            .connectTimeout(60, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)

        // Se apiKey è presente, aggiungi un interceptor che usa X-API-Key
        apiKey?.let {
            val apiKeyInterceptor = Interceptor { chain ->
                val originalRequest: Request = chain.request()
                val newRequest = originalRequest.newBuilder()
                    .header("X-API-Key", apiKey)
                    .build()
                chain.proceed(newRequest)
            }
            clientBuilder.addInterceptor(apiKeyInterceptor)
        }

        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .addConverterFactory(GsonConverterFactory.create())
            .client(clientBuilder.build())
            .build()
    }
}
