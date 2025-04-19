package com.example.encoder

import android.util.Base64

fun encodeToBase64(input: String): String {
    val inputBytes = input.toByteArray(Charsets.UTF_8)
    return Base64.encodeToString(inputBytes, Base64.DEFAULT)
}

fun decodeFromBase64(encoded: String): String {
    val decodedBytes = Base64.decode(encoded, Base64.DEFAULT)
    return String(decodedBytes, Charsets.UTF_8)
}