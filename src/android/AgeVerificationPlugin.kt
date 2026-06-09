package com.crowdhub.ageverification

import org.apache.cordova.CallbackContext
import org.apache.cordova.CordovaPlugin
import org.json.JSONArray
import org.json.JSONObject

import com.google.android.play.agesignals.AgeSignalsException
import com.google.android.play.agesignals.AgeSignalsManagerFactory
import com.google.android.play.agesignals.AgeSignalsRequest
import com.google.android.play.agesignals.AgeSignalsResult
import com.google.android.play.agesignals.model.AgeSignalsVerificationStatus

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Cordova bridge for the Google Play Age Signals API.
 *
 * Normalizes [AgeSignalsResult] into the shared cross-platform JSON shape so the
 * JavaScript layer can treat Android and iOS uniformly.
 */
class AgeVerificationPlugin : CordovaPlugin() {

    override fun execute(
        action: String,
        args: JSONArray,
        callbackContext: CallbackContext
    ): Boolean {
        return when (action) {
            "requestAgeRange" -> {
                requestAgeRange(callbackContext)
                true
            }
            "isSupported" -> {
                isSupported(callbackContext)
                true
            }
            else -> false
        }
    }

    private fun isSupported(callbackContext: CallbackContext) {
        // The library requires minSdk 23 and only returns data on Play-managed
        // installs; availability of actual signals is region-gated at runtime.
        val json = JSONObject().apply {
            put("supported", true)
            put("platform", "android")
        }
        callbackContext.success(json)
    }

    private fun requestAgeRange(callbackContext: CallbackContext) {
        val context = cordova.activity.applicationContext
        val manager = AgeSignalsManagerFactory.create(context)

        manager.checkAgeSignals(AgeSignalsRequest.builder().build())
            .addOnSuccessListener { result ->
                callbackContext.success(buildResult(result))
            }
            .addOnFailureListener { error ->
                val payload = JSONObject().apply {
                    put("platform", "android")
                    put("status", "notAvailable")
                    put("available", false)
                    if (error is AgeSignalsException) {
                        put("code", error.errorCode)
                    }
                    put("message", error.localizedMessage ?: error.toString())
                }
                callbackContext.error(payload)
            }
    }

    private fun buildResult(result: AgeSignalsResult): JSONObject {
        val statusCode: Int? = result.userStatus()
        val lower: Int? = result.ageLower()
        val upper: Int? = result.ageUpper()

        val normalizedStatus = normalizeStatus(statusCode)
        val available = statusCode != null && normalizedStatus != STATUS_UNKNOWN

        val raw = JSONObject().apply {
            put("verificationStatus", statusCode?.let { statusName(it) } ?: JSONObject.NULL)
            put("verificationStatusCode", statusCode ?: JSONObject.NULL)
            put("ageLower", lower ?: JSONObject.NULL)
            put("ageUpper", upper ?: JSONObject.NULL)
            put("installId", result.installId() ?: JSONObject.NULL)
            put("mostRecentApprovalDate", formatDate(result.mostRecentApprovalDate()))
        }

        return JSONObject().apply {
            put("platform", "android")
            put("available", available)
            put("status", normalizedStatus)
            put("lowerBound", lower ?: JSONObject.NULL)
            put("upperBound", upper ?: JSONObject.NULL)
            put("declaration", declarationFor(statusCode) ?: JSONObject.NULL)
            put("raw", raw)
        }
    }

    private fun normalizeStatus(statusCode: Int?): String = when (statusCode) {
        AgeSignalsVerificationStatus.VERIFIED -> "verified"
        AgeSignalsVerificationStatus.SUPERVISED -> "supervised"
        AgeSignalsVerificationStatus.SUPERVISED_APPROVAL_PENDING -> "supervisedApprovalPending"
        AgeSignalsVerificationStatus.SUPERVISED_APPROVAL_DENIED -> "supervisedApprovalDenied"
        AgeSignalsVerificationStatus.DECLARED -> "declared"
        AgeSignalsVerificationStatus.UNKNOWN -> STATUS_UNKNOWN
        else -> "notAvailable"
    }

    private fun statusName(statusCode: Int): String = when (statusCode) {
        AgeSignalsVerificationStatus.VERIFIED -> "VERIFIED"
        AgeSignalsVerificationStatus.SUPERVISED -> "SUPERVISED"
        AgeSignalsVerificationStatus.SUPERVISED_APPROVAL_PENDING -> "SUPERVISED_APPROVAL_PENDING"
        AgeSignalsVerificationStatus.SUPERVISED_APPROVAL_DENIED -> "SUPERVISED_APPROVAL_DENIED"
        AgeSignalsVerificationStatus.DECLARED -> "DECLARED"
        AgeSignalsVerificationStatus.UNKNOWN -> "UNKNOWN"
        else -> "UNKNOWN"
    }

    private fun declarationFor(statusCode: Int?): String? = when (statusCode) {
        AgeSignalsVerificationStatus.VERIFIED -> "confirmed"
        AgeSignalsVerificationStatus.SUPERVISED,
        AgeSignalsVerificationStatus.SUPERVISED_APPROVAL_PENDING,
        AgeSignalsVerificationStatus.SUPERVISED_APPROVAL_DENIED -> "guardianDeclared"
        AgeSignalsVerificationStatus.DECLARED -> "selfDeclared"
        else -> null
    }

    private fun formatDate(date: Date?): Any {
        if (date == null) return JSONObject.NULL
        val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        return formatter.format(date)
    }

    private companion object {
        const val STATUS_UNKNOWN = "unknown"
    }
}
